// Spec-0004 v0.2: Docker + PostgreSQL + Angular + Chromium reales, solo datos ficticios.
// Requiere imagen backend construida y frontend compilado; Playwright se instala fuera del proyecto.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createServer, request } from "node:http";
import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve, extname, sep } from "node:path";
import { setTimeout as esperar } from "node:timers/promises";

const { chromium, expect } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULO || "playwright/test",
);
const sufijo = `catalogos80-${process.pid}`;
const red = `${sufijo}-red`,
  postgres = `${sufijo}-pg`,
  api = `${sufijo}-api`,
  fallo = `${sufijo}-fallo`;
const imagen =
  process.env.IMAGEN_PRUEBA || "actualizacion-datos-backend:issue-80";
const docker = (...args) =>
  execFileSync("docker", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 10 * 1024 * 1024,
  });
const sql = (consulta) =>
  docker(
    "exec",
    postgres,
    "psql",
    "-U",
    "postgres",
    "-d",
    "prueba_catalogos80",
    "-v",
    "ON_ERROR_STOP=1",
    "-Atc",
    consulta,
  ).trim();
const entorno = [
  "--network",
  red,
  "-e",
  "ASPNETCORE_ENVIRONMENT=Production",
  "-e",
  `ConnectionStrings__Default=Host=${postgres};Database=prueba_catalogos80;Username=postgres`,
  "-e",
  "CuentaBancaria__PermitirClavesTemporales=true",
];
const ejecutar = (...args) =>
  docker("run", "--rm", ...entorno, imagen, ...args);
const ids = () =>
  sql(
    "SELECT count(*) || ':' || md5(string_agg(id::text || codigo, '|' ORDER BY id)) FROM elementos_catalogo",
  );
let servidor, navegador;
try {
  docker("network", "create", red);
  docker(
    "run",
    "-d",
    "--name",
    postgres,
    "--network",
    red,
    "-e",
    "POSTGRES_DB=prueba_catalogos80",
    "-e",
    "POSTGRES_HOST_AUTH_METHOD=trust",
    "postgres:17-alpine",
  );
  for (let intento = 0; ; intento++) {
    const listo = spawnSync(
      "docker",
      ["exec", postgres, "pg_isready", "-U", "postgres"],
      { stdio: "ignore" },
    );
    if (listo.status === 0) break;
    assert(intento < 120, "PostgreSQL no arrancó");
    await esperar(250);
  }
  assert.equal(
    docker(
      "run",
      "--rm",
      "--entrypoint",
      "sh",
      imagen,
      "-c",
      'find /app/catalogos -name "*.csv" | wc -l',
    ).trim(),
    "17",
  );
  ejecutar("--migrar");
  const incompleto = spawnSync(
    "docker",
    ["run", "--rm", "--name", fallo, ...entorno, imagen],
    { encoding: "utf8", timeout: 30000 },
  );
  assert.notEqual(incompleto.status, 0);
  assert.match(
    incompleto.stdout + incompleto.stderr,
    /Catálogos obligatorios incompletos/,
  );
  ejecutar("--cargar-catalogos");
  const inicial = ids();
  assert.match(inicial, /^2350:/);
  sql(
    "UPDATE elementos_catalogo SET activo=false WHERE id=(SELECT min(id) FROM elementos_catalogo WHERE tipo='Etnia')",
  );
  ejecutar("--cargar-catalogos");
  assert.equal(ids(), inicial);
  assert.equal(
    sql(
      "SELECT count(*) FROM elementos_catalogo WHERE tipo='Etnia' AND NOT activo",
    ),
    "1",
  );
  assert.equal(
    sql("SELECT count(DISTINCT tipo) FROM elementos_catalogo WHERE activo"),
    "21",
  );
  console.log(
    "V-06/07: imagen con 17 CSV, Production incompleta rechazada, 2350 elementos, doble carga e inactivo conservado.",
  );
  sql(`INSERT INTO instituciones (id,nombre,activa,fecha_creacion_utc) VALUES ('00000000-0000-0000-0000-000000000080','Institución ficticia de catálogos',true,now());
    INSERT INTO personas (id,institucion_id,documento,nombre,correo,rol,acceso_habilitado,estado_actualizacion,fecha_creacion_utc,tratamiento_datos_aceptado)
    VALUES ('00000000-0000-0000-0000-000000000081','00000000-0000-0000-0000-000000000080','0000000080','Persona ficticia','persona@ejemplo.test','Usuario',true,'Borrador',now(),true);
    INSERT INTO campanas (id,institucion_id,nombre,fecha_inicio_utc,fecha_fin_utc,activa) VALUES ('00000000-0000-0000-0000-000000000082','00000000-0000-0000-0000-000000000080','Campaña ficticia',now()-interval '1 day',now()+interval '1 day',true);`);
  docker(
    "run",
    "-d",
    "--name",
    api,
    ...entorno,
    "-p",
    "127.0.0.1::8080",
    imagen,
  );
  const puerto = docker("port", api, "8080/tcp").trim().split(":").at(-1);
  const backend = `http://127.0.0.1:${puerto}`;
  for (let intento = 0; ; intento++) {
    try {
      if ((await fetch(`${backend}/health`)).ok) break;
    } catch {}
    assert(intento < 120, "API Production no arrancó");
    await esperar(250);
  }
  const dist = resolve("src/Frontend/dist/Frontend/browser");
  assert(existsSync(`${dist}/index.html`), "Compile el frontend primero");
  servidor = createServer((peticion, respuesta) => {
    if (
      peticion.url.startsWith("/api/") ||
      peticion.url.startsWith("/health")
    ) {
      const proxy = request(
        new URL(peticion.url, backend),
        { method: peticion.method, headers: peticion.headers },
        (remota) => {
          respuesta.writeHead(remota.statusCode, remota.headers);
          remota.pipe(respuesta);
        },
      );
      proxy.on("error", () => {
        respuesta.writeHead(502);
        respuesta.end();
      });
      peticion.pipe(proxy);
      return;
    }
    const ruta = resolve(
      dist,
      `.${decodeURIComponent(new URL(peticion.url, "http://local").pathname)}`,
    );
    if (!ruta.startsWith(dist + sep)) {
      respuesta.writeHead(403);
      respuesta.end();
      return;
    }
    try {
      const archivo =
        existsSync(ruta) && extname(ruta) ? ruta : `${dist}/index.html`;
      const tipos = {
        ".js": "text/javascript",
        ".css": "text/css",
        ".html": "text/html",
        ".svg": "image/svg+xml",
        ".png": "image/png",
      };
      respuesta.setHeader(
        "Content-Type",
        tipos[extname(archivo)] || "application/octet-stream",
      );
      respuesta.end(readFileSync(archivo));
    } catch {
      respuesta.writeHead(404);
      respuesta.end();
    }
  });
  await new Promise((listo) => servidor.listen(0, "127.0.0.1", listo));
  const base = `http://127.0.0.1:${servidor.address().port}`;
  navegador = await chromium.launch({
    headless: true,
    ...(process.env.NAVEGADOR_PRUEBA
      ? { executablePath: process.env.NAVEGADOR_PRUEBA }
      : {}),
  });
  const contexto = await navegador.newContext({
    baseURL: base,
    viewport: { width: 1440, height: 1000 },
  });
  const llamada = async (metodo, ruta, datos) => {
    const respuesta = await contexto.request.fetch(ruta, {
      method: metodo,
      ...(datos ? { data: datos } : {}),
    });
    assert(
      respuesta.ok(),
      `${metodo} ${ruta}: ${respuesta.status()} ${await respuesta.text()}`,
    );
    return respuesta.status() === 204 ? null : respuesta.json();
  };
  await llamada("POST", "/api/auth/login", {
    documento: "0000000080",
    contrasena: "0000000080",
  });
  await llamada("POST", "/api/auth/cambiar-clave", {
    contrasenaActual: "0000000080",
    nuevaContrasena: "ClaveFicticiaCatalogos80!",
  });
  const catalogo = (tipo) => llamada("GET", `/api/catalogos/${tipo}`);
  const pagina = await contexto.newPage();
  const errores = [];
  pagina.on("pageerror", (error) => errores.push(error.message));
  await pagina.goto("/usuario");
  await expect(pagina.getByTestId("input-primer-nombre")).toBeVisible();
  await pagina.getByTestId("input-primer-nombre").fill("Persona");
  await pagina.getByTestId("input-primer-apellido").fill("Ficticia");
  await pagina.getByTestId("input-fecha-nacimiento").fill("1990-01-01");
  await pagina.getByTestId("input-calle-principal").fill("Calle ficticia");
  await pagina.getByTestId("input-celular").fill("0900000000");
  await pagina.getByTestId("input-correo-inst").fill("persona@ejemplo.test");
  const elegir = async (testid, indice = 1) => {
    const select = pagina.getByTestId(testid);
    await expect(select.locator("option").nth(indice)).toBeAttached();
    const valor = await select
      .locator("option")
      .nth(indice)
      .getAttribute("value");
    await select.selectOption(valor);
    return valor;
  };
  const ecuador = (await catalogo("Pais")).find((e) => e.codigo === "218");
  await pagina
    .getByTestId("select-nacionalidad")
    .selectOption({ label: ecuador.nombre });
  await elegir("select-etnia");
  await elegir("select-estado-civil");
  await elegir("select-tipo-sangre");
  await elegir("select-provincia-residencia");
  await elegir("select-canton-residencia");
  await elegir("select-parroquia-residencia");
  const guardadoFicha = pagina.waitForResponse(
    (r) =>
      r.url().endsWith("/hoja-de-vida/ficha") && r.request().method() === "PUT",
  );
  await pagina.getByTestId("btn-guardar-ficha").click();
  const respuestaFicha = await guardadoFicha;
  assert(
    respuestaFicha.ok(),
    `HTTP ${respuestaFicha.status()}: ${await respuestaFicha.text()} / ${respuestaFicha.request().postData()}`,
  );
  const ficha = await llamada("GET", "/api/mis-datos/hoja-de-vida/ficha");
  assert.equal(ficha.paisNacionalidadId, ecuador.id);
  assert(ficha.parroquiaResidenciaId);
  mkdirSync("docs/evidencia/issue-80/v2", { recursive: true });
  await pagina
    .getByTestId("seccion-ficha-personal")
    .screenshot({ path: "docs/evidencia/issue-80/v2/ficha.png" });
  console.log(
    "V-08: país, etnia y cascada geográfica; ficha guardada en PostgreSQL.",
  );
  await pagina.getByTestId("tab-formacion-academica").click();
  const universidades = await catalogo("Universidad");
  assert.equal(universidades.length, 280);
  const grado = (await catalogo("GradoAcademico")).find(
    (e) => e.codigo === "3",
  );
  assert(grado, "Grado de tercer nivel disponible");
  const nivel = (await catalogo("NivelAcademico")).find(
    (e) => e.id === grado.padreId,
  );
  const pdf = Buffer.from("%PDF-1.4\nDocumento ficticio de prueba\n%%EOF");
  for (const [nombre, institucion] of [
    [
      "Título ficticio universidad",
      universidades.find((e) => e.codigo === "1001"),
    ],
    [
      "Título ficticio instituto",
      universidades.find((e) => e.codigo === "2001"),
    ],
    ["Título ficticio extranjero", null],
  ]) {
    await pagina.getByTestId("btn-nuevo-titulo").click();
    await pagina
      .getByTestId("select-nivel-academico")
      .selectOption({ label: nivel.nombre });
    await pagina
      .getByTestId("select-grado-academico")
      .selectOption({ label: grado.nombre });
    await pagina.getByTestId("input-nombre-titulo").fill(nombre);
    await pagina.getByTestId("input-fecha-obtencion").fill("2020-01-01");
    await pagina
      .getByTestId("input-registro-senescyt")
      .fill("REGISTRO-FICTICIO-80");
    if (institucion)
      await pagina
        .getByTestId("select-universidad")
        .selectOption({ label: institucion.nombre });
    else
      await pagina
        .getByTestId("input-institucion-otra")
        .fill("Institución extranjera ficticia");
    await elegir("select-campo-amplio");
    await elegir("select-campo-especifico");
    await elegir("select-campo-detallado");
    await pagina
      .getByTestId("input-archivo")
      .setInputFiles({
        name: "respaldo-ficticio.pdf",
        mimeType: "application/pdf",
        buffer: pdf,
      });
    await expect(pagina.getByTestId("archivo-asignado")).toBeVisible();
    const guardado = pagina.waitForResponse(
      (r) =>
        r.url().endsWith("/hoja-de-vida/titulos") &&
        r.request().method() === "POST",
    );
    await pagina.getByTestId("btn-guardar-titulo").click();
    const respuestaTitulo = await guardado;
    assert(respuestaTitulo.ok(), await respuestaTitulo.text());
    await expect(pagina.getByTestId("form-titulo")).toHaveCount(0);
  }
  await pagina.reload();
  await pagina.getByTestId("tab-formacion-academica").click();
  await expect(
    pagina.getByTestId("tabla-titulos").locator("tbody tr"),
  ).toHaveCount(3);
  const hoja = await llamada("GET", "/api/mis-datos/hoja-de-vida/");
  assert.equal(hoja.titulos.length, 3);
  assert(hoja.titulos.every((t) => t.archivoId && t.campoDetalladoUnescoId));
  assert(
    hoja.titulos.some(
      (t) => t.nombreInstitucionOtra === "Institución extranjera ficticia",
    ),
  );
  await pagina
    .getByTestId("seccion-formacion-academica")
    .screenshot({ path: "docs/evidencia/issue-80/v2/titulos.png" });
  await pagina.getByTestId("subtab-en-curso").click();
  await pagina.getByTestId("btn-nuevo-en-curso").click();
  await pagina.getByTestId("checkbox-tiene-beca").check();
  await expect(
    pagina.getByTestId("select-tipo-beca").locator("option"),
  ).toHaveCount(4);
  await expect(
    pagina.getByTestId("select-financiamiento-beca").locator("option"),
  ).toHaveCount(5);
  await pagina
    .getByTestId("input-nombre-programa")
    .fill("Programa ficticio con beca");
  await pagina
    .getByTestId("select-grado-en-curso")
    .selectOption({ label: grado.nombre });
  await pagina
    .getByTestId("input-institucion-en-curso")
    .fill("Institución ficticia de prueba");
  await elegir("select-tipo-beca");
  await elegir("select-financiamiento-beca");
  await pagina.getByTestId("input-porcentaje-beca").fill("50");
  await pagina
    .getByTestId("input-archivo")
    .setInputFiles({
      name: "matricula-ficticia.pdf",
      mimeType: "application/pdf",
      buffer: pdf,
    });
  await expect(pagina.getByTestId("archivo-asignado")).toBeVisible();
  const estudioGuardado = pagina.waitForResponse(
    (r) =>
      r.url().endsWith("/hoja-de-vida/titulos-en-curso") &&
      r.request().method() === "POST",
  );
  await pagina.getByTestId("btn-guardar-en-curso").click();
  const estudio = await estudioGuardado;
  assert(estudio.ok(), await estudio.text());
  const estudioPersistido = await estudio.json();
  assert(
    estudioPersistido.tieneBeca &&
      estudioPersistido.tipoBecaId &&
      estudioPersistido.financiamientoBecaId,
  );
  console.log(
    "V-09: 280 IES; tres títulos con respaldo y UNESCO guardados y recuperados; becas disponibles.",
  );
  await pagina.getByTestId("tab-ficha-personal").click();
  await expect(pagina.locator("#banco option")).toHaveCount(29);
  const banco = (await catalogo("Banco"))[0];
  assert.equal((await catalogo("TipoCuentaBancaria")).length, 2);
  await pagina.locator("#banco").selectOption({ label: banco.nombre });
  await pagina.locator("#numero-nuevo").fill("0000000000");
  const guardarCuenta = () =>
    pagina.waitForResponse(
      (r) =>
        r.url().replace(/\/$/, "").endsWith("/mis-datos/cuenta-bancaria") &&
        r.request().method() === "PUT",
    );
  const primeraCuenta = guardarCuenta();
  await pagina
    .getByRole("button", { name: "Guardar cuenta", exact: true })
    .click();
  const respuestaCuenta = await primeraCuenta;
  assert(respuestaCuenta.ok(), await respuestaCuenta.text());
  const cuenta = await respuestaCuenta.json();
  assert.equal(cuenta.bancoId, banco.id);
  assert.notEqual(cuenta.numeroEnmascarado, "0000000000");
  await pagina
    .locator("#banco")
    .selectOption({ label: "Otro (escribir el nombre)" });
  await pagina.locator("#banco-otro").fill("Banco ficticio externo");
  await pagina.locator("#numero-nuevo").fill("0000000000");
  const segundaCuenta = guardarCuenta();
  await pagina
    .getByRole("button", { name: "Guardar cuenta", exact: true })
    .click();
  const respuestaOtra = await segundaCuenta;
  assert(respuestaOtra.ok(), await respuestaOtra.text());
  const otra = await respuestaOtra.json();
  assert.equal(otra.banco, "Banco ficticio externo");
  await pagina.reload();
  await expect(pagina.getByTestId("cuenta-actual")).toContainText(
    "Banco ficticio externo",
  );
  assert((await catalogo("TipoCapacitacion")).length > 0);
  await pagina
    .locator("app-mi-cuenta-bancaria")
    .screenshot({ path: "docs/evidencia/issue-80/v2/cuenta.png" });
  assert.deepEqual(errores, []);
  console.log(
    "V-10: 28 bancos y 2 tipos, componente con API real; banco de catálogo y escrito, número enmascarado. Sin errores de página.",
  );
} finally {
  await navegador?.close();
  if (servidor) await new Promise((listo) => servidor.close(listo));
  for (const nombre of [fallo, api, postgres])
    spawnSync("docker", ["rm", "-f", nombre], { stdio: "ignore" });
  spawnSync("docker", ["network", "rm", red], { stdio: "ignore" });
}
