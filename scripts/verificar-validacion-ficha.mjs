// Spec-0007 v0.1: Docker + PostgreSQL + Angular + Chromium reales, solo datos ficticios.
// Requiere imagen backend construida y frontend compilado; Playwright se instala fuera del proyecto.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve, extname, sep } from "node:path";
import { setTimeout as esperar } from "node:timers/promises";
import { crearServidorPruebasE2E } from "./servidor-pruebas-e2e.mjs";

const { chromium, expect } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULO || "playwright/test",
);
const sufijo = `validacion88-${process.pid}`;
const red = `${sufijo}-red`,
  postgres = `${sufijo}-pg`,
  api = `${sufijo}-api`,
  fallo = `${sufijo}-fallo`;
const imagen =
  process.env.IMAGEN_PRUEBA || "actualizacion-datos-backend:issue-88";
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
    "prueba_validacion88",
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
  `ConnectionStrings__Default=Host=${postgres};Database=prueba_validacion88;Username=postgres`,
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
    "POSTGRES_DB=prueba_validacion88",
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
  sql(`INSERT INTO instituciones (id,nombre,activa,fecha_creacion_utc) VALUES ('00000000-0000-0000-0000-000000000088','Institución ficticia de catálogos',true,now());
    INSERT INTO personas (id,institucion_id,documento,nombre,correo,rol,acceso_habilitado,estado_actualizacion,fecha_creacion_utc,tratamiento_datos_aceptado)
    VALUES ('00000000-0000-0000-0000-000000000081','00000000-0000-0000-0000-000000000088','0000000088','Persona ficticia','persona@ejemplo.test','Usuario',true,'Borrador',now(),true);
    INSERT INTO personas (id,institucion_id,documento,nombre,rol,acceso_habilitado,estado_actualizacion,fecha_creacion_utc,tratamiento_datos_aceptado) VALUES ('00000000-0000-0000-0000-000000000083','00000000-0000-0000-0000-000000000088','0000000089','Administrador ficticio','Admin',true,'Borrador',now(),true);
    INSERT INTO campanas (id,institucion_id,nombre,fecha_inicio_utc,fecha_fin_utc,activa) VALUES ('00000000-0000-0000-0000-000000000082','00000000-0000-0000-0000-000000000088','Campaña ficticia',now()-interval '1 day',now()+interval '1 day',true);`);
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
  servidor = crearServidorPruebasE2E({ puertoBackend: puerto, rutaDist: dist });
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
    documento: "0000000088",
    contrasena: "0000000088",
  });
  await llamada("POST", "/api/auth/cambiar-clave", {
    contrasenaActual: "0000000088",
    nuevaContrasena: "ClaveFicticiaCatalogos80!",
  });
  const admin = await navegador.newContext({ baseURL: base });
  const apiAdmin = async (metodo, ruta, datos) => {
    const respuesta = await admin.request.fetch(ruta, { method: metodo, ...(datos ? { data: datos } : {}) });
    assert(respuesta.ok(), `${metodo} ${ruta}: ${respuesta.status()} ${await respuesta.text()}`);
    return respuesta.status() === 204 ? null : respuesta.json();
  };
  await apiAdmin("POST", "/api/auth/login", { documento: "0000000089", contrasena: "0000000089" });
  await apiAdmin("POST", "/api/auth/cambiar-clave", { contrasenaActual: "0000000089", nuevaContrasena: "ClaveFicticiaValidacion88!" });
  const paginaAdmin = await admin.newPage();
  await paginaAdmin.goto("/admin");
  await paginaAdmin.getByTestId("tab-configuracion").click();
  await expect(paginaAdmin.getByText("No hay dominios configurados", { exact: false })).toBeVisible();
  await paginaAdmin.locator("#dominios-correo").fill("@INSTITUCION-FICTICIA.EXAMPLE");
  const dominiosGuardados = paginaAdmin.waitForResponse(r => r.url().endsWith("/correo-institucional") && r.request().method() === "PUT");
  await paginaAdmin.getByRole("button", { name: "Guardar dominios", exact: true }).click();
  assert((await dominiosGuardados).ok());
  await expect(paginaAdmin.getByText("Dominios guardados.", { exact: true })).toBeVisible();
  assert.deepEqual((await llamada("GET", "/api/configuracion/politica-validacion")).dominiosCorreoPermitidos, ["institucion-ficticia.example"]);
  console.log("V-02: configuración administrativa real, normalización y política del usuario.");
  const pagina = await contexto.newPage();
  const errores = [];
  pagina.on("pageerror", error => errores.push(error.message));
  await pagina.goto("/usuario");
  await expect(pagina.getByTestId("input-primer-nombre")).toBeVisible();
  assert.equal(await pagina.locator('[name="perfil"]').count(), 0);
  await pagina.getByTestId("input-primer-nombre").fill("Persona Ficticia");
  await pagina.getByTestId("input-primer-apellido").fill("Apellido Ficticio");
  await pagina.getByTestId("input-fecha-nacimiento").fill("1990-01-01");
  await pagina.getByTestId("input-calle-principal").fill("Calle ficticia");
  await pagina.getByTestId("input-celular").fill("0900000000");
  await pagina.getByTestId("input-correo-inst").fill("persona@institucion-ficticia.example");
  const casos = [
    ["input-primer-nombre", "Persona1", "primerNombre", "Persona Ficticia"],
    ["input-primer-apellido", "Apellido@", "primerApellido", "Apellido Ficticio"],
    ["input-celular", "0800000000", "celular", "0900000000"],
    ["input-fecha-nacimiento", "2099-01-01", "fechaNacimiento", "1990-01-01"],
    ["input-correo-inst", "persona@otra-ficticia.example", "correoInstitucional", "persona@institucion-ficticia.example"],
  ];
  for (const [testid, valor, campo, valido] of casos) {
    await pagina.getByTestId(testid).fill(valor);
    await expect(pagina.getByTestId("btn-guardar-ficha")).toBeDisabled();
    await expect(pagina.getByTestId("btn-enviar-revision-top")).toBeDisabled();
    await expect(pagina.locator(`#error-modelo-${campo}`)).toBeVisible();
    await pagina.getByTestId(testid).fill(valido);
  }
  await pagina.locator('#codigoPostal').fill('170306ssssss');
  await expect(pagina.getByTestId("btn-guardar-ficha")).toBeDisabled();
  await expect(pagina.locator('#error-modelo-codigoPostal')).toBeVisible();
  mkdirSync("docs/evidencia/issue-88", { recursive: true });
  await pagina.getByTestId("seccion-ficha-personal").screenshot({ path: "docs/evidencia/issue-88/validacion.png" });
  await pagina.locator('#codigoPostal').fill('000001');
  for (const [campo, valor] of [["perfil", "Perfil ficticio"], ["perfil", ""], ["perfil", null], ["celular", "0800000000"], ["codigoPostal", "170306ssssss"], ["correoInstitucional", "a@b@institucion-ficticia.example"], ["correoInstitucional", "persona@otra-ficticia.example"]]) {
    const respuesta = await contexto.request.put('/api/mis-datos/hoja-de-vida/ficha', { data: { [campo]: valor } });
    assert.equal(respuesta.status(), 400);
    assert((await respuesta.json()).errores[campo]);
  }
  const catalogo = tipo => llamada("GET", `/api/catalogos/${tipo}`);
  const pais = (await catalogo('Pais')).find(e => e.codigo === '218');
  await pagina.getByTestId('select-nacionalidad').selectOption({ label: pais.nombre });
  await pagina.locator('#paisNacimiento').selectOption({ label: pais.nombre });
  const elegir = async selector => { const opciones = pagina.locator(selector).locator('option'); await expect(opciones.nth(1)).toBeAttached(); await pagina.locator(selector).selectOption(await opciones.nth(1).getAttribute('value')); };
  await elegir('#sexo'); await elegir('#estadoCivil');
  await elegir('#provinciaResidencia'); await elegir('#cantonResidencia'); await elegir('#parroquiaResidencia');
  const guardada = pagina.waitForResponse(r => r.url().endsWith('/hoja-de-vida/ficha') && r.request().method() === 'PUT');
  await pagina.getByTestId('btn-guardar-ficha').click();
  const respuestaFicha = await guardada;
  assert(respuestaFicha.ok(), await respuestaFicha.text());
  assert(!Object.hasOwn(respuestaFicha.request().postDataJSON(), 'perfil'));
  await pagina.reload();
  await expect(pagina.getByTestId('input-celular')).toHaveValue('0900000000');
  console.log("V-01/03: mensajes en campo, bloqueo Guardar/Enviar, API 400 y corrección persistida sin perfil.");
  const pdf = Buffer.from('%PDF-1.4\nDocumento ficticio de prueba\n%%EOF');
  const subida = await contexto.request.post('/api/archivos/subir', { multipart: { archivo: { name: 'titulo-ficticio.pdf', mimeType: 'application/pdf', buffer: pdf } } });
  assert(subida.ok(), await subida.text());
  const archivo = await subida.json();
  const grado = (await catalogo('GradoAcademico'))[0];
  await llamada('POST', '/api/mis-datos/hoja-de-vida/titulos', { nombreTitulo: 'Título ficticio', gradoAcademicoId: grado.id, nombreInstitucionOtra: 'Institución Ficticia', archivoId: archivo.id });
  for (const nombre of ['Referencia Ficticia Uno', 'Referencia Ficticia Dos']) await llamada('POST', '/api/mis-datos/hoja-de-vida/referencias', { tipo: 'personal', nombresApellidos: nombre, telefono: '0900000000' });
  const tipoCuenta = (await catalogo('TipoCuentaBancaria'))[0];
  await llamada('PUT', '/api/mis-datos/cuenta-bancaria', { tipoCuentaId: tipoCuenta.id, numero: '0000000000', nombreBancoOtro: 'Banco Ficticio' });
  const faltantes = await llamada('GET', '/api/mis-datos/hoja-de-vida/faltantes');
  assert.deepEqual(faltantes.faltantes, []);
  await pagina.reload();
  pagina.on('dialog', dialogo => dialogo.accept());
  const enviado = pagina.waitForResponse(r => r.url().endsWith('/mis-datos/enviar') && r.request().method() === 'POST');
  await pagina.getByTestId('btn-enviar-revision-top').click();
  assert((await enviado).ok());
  const revision = await apiAdmin('GET', '/api/revision/0000000088/hoja-de-vida');
  assert(revision.ficha.perfil.includes('1 título(s)'));
  assert.equal(revision.estadoActualizacion, 'enviado');
  await apiAdmin('POST', '/api/revision/0000000088/aprobar');
  const zip = await admin.request.get('/api/exportaciones/zip');
  assert(zip.ok());
  const excel = await admin.request.get('/api/exportaciones/excel');
  assert(excel.ok());
  assert.deepEqual(errores, []);
  const logs = docker('logs', api);
  assert(!logs.includes('170306ssssss'), 'Los logs no deben incluir el dato inválido');
  assert(!logs.includes('a@b@institucion-ficticia.example'));
  console.log("V-04/05: envío válido desde navegador, revisión con perfil generado, aprobación y exportaciones reales; sin eco de datos inválidos ni errores de página.");
  await admin.close();
} finally {
  await navegador?.close();
  if (servidor) await new Promise(listo => servidor.close(listo));
  for (const nombre of [fallo, api, postgres]) spawnSync("docker", ["rm", "-f", nombre], { stdio: "ignore" });
  spawnSync("docker", ["network", "rm", red], { stdio: "ignore" });
}
