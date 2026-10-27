// Pruebas unitarias y de integración para el proxy seguro de pruebas E2E (ADR-0031).
import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validarRutaProxy, crearServidorPruebasE2E } from "./servidor-pruebas-e2e.mjs";

test("validarRutaProxy acepta rutas legítimas", () => {
  const rutasValidas = [
    "/health",
    "/health?formato=json",
    "/api/auth/login",
    "/api/mis-datos/ficha",
    "/api/personas/00000000-0000-0000-0000-000000000001?seccion=personal",
    "/api/catalogos/tipos-institucionales?activo=true",
  ];

  for (const ruta of rutasValidas) {
    const res = validarRutaProxy(ruta);
    assert.equal(res.esValida, true, `La ruta debería ser válida: ${ruta}`);
    assert.ok(res.pathname);
  }
});

test("validarRutaProxy rechaza URLs absolutas y de protocolo relativo (prevención SSRF)", () => {
  const intentosSSRF = [
    "http://sitio-malicioso.test/api/datos",
    "https://sitio-malicioso.test/health",
    "//sitio-malicioso.test/api/auth/login",
    "//127.0.0.1/api/datos",
    "ftp://servidor.interno/api/recurso",
    "javascript:alert(1)",
  ];

  for (const url of intentosSSRF) {
    const res = validarRutaProxy(url);
    assert.equal(res.esValida, false, `Debería rechazar intento SSRF: ${url}`);
  }
});

test("validarRutaProxy rechaza secuencias de path traversal y escapes maliciosos", () => {
  const rutasPeligrosas = [
    "/api/../admin",
    "/api/subcarpeta/../../etc/passwd",
    "/api/%2e%2e/secreto",
    "/api/%2E%2E/secreto",
    "/api%2f..%2fadmin",
    "/health/../configuracion",
  ];

  for (const ruta of rutasPeligrosas) {
    const res = validarRutaProxy(ruta);
    assert.equal(res.esValida, false, `Debería rechazar traversal: ${ruta}`);
  }
});

test("validarRutaProxy rechaza rutas fuera de /api/ y /health", () => {
  const rutasNoApi = [
    "/",
    "/index.html",
    "/assets/logo.png",
    "/admin",
    "/dashboard",
    "",
    null,
    undefined,
  ];

  for (const ruta of rutasNoApi) {
    const res = validarRutaProxy(ruta);
    assert.equal(res.esValida, false, `Debería rechazar ruta no API: ${ruta}`);
  }
});

test("crearServidorPruebasE2E reenvía peticiones legítimas a 127.0.0.1 y bloquea ataques", async () => {
  // 1. Crear servidor backend simulado
  let recibioEnBackend = false;
  let rutaRecibida = "";
  let hostHeaderRecibido = "";

  const backendSimulado = createServer((req, res) => {
    recibioEnBackend = true;
    rutaRecibida = req.url;
    hostHeaderRecibido = req.headers.host;
    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ estado: "Saludable" }));
      return;
    }
    if (req.url.startsWith("/api/prueba")) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, datos: "ficticios" }));
      return;
    }
    res.writeHead(404);
    res.end();
  });

  await new Promise((resolve) => backendSimulado.listen(0, "127.0.0.1", resolve));
  const puertoBackend = backendSimulado.address().port;

  // 2. Crear directorio dist temporal para frontend
  const dirTemp = mkdtempSync(join(tmpdir(), "dist-test-"));
  writeFileSync(join(dirTemp, "index.html"), "<html><body>App Ficticia</body></html>");
  writeFileSync(join(dirTemp, "estilo.css"), "body { margin: 0; }");

  // 3. Iniciar el servidor proxy de pruebas
  const servidorProxy = crearServidorPruebasE2E({
    puertoBackend,
    rutaDist: dirTemp,
  });

  await new Promise((resolve) => servidorProxy.listen(0, "127.0.0.1", resolve));
  const puertoProxy = servidorProxy.address().port;
  const baseProxy = `http://127.0.0.1:${puertoProxy}`;

  try {
    // Caso 1: /health se reenvía al backend correctamente
    const resHealth = await fetch(`${baseProxy}/health`);
    assert.equal(resHealth.status, 200);
    const jsonHealth = await resHealth.json();
    assert.equal(jsonHealth.estado, "Saludable");
    assert.equal(rutaRecibida, "/health");
    assert.equal(hostHeaderRecibido, `127.0.0.1:${puertoBackend}`);

    // Caso 2: /api/prueba con query string se reenvía al backend
    recibioEnBackend = false;
    const resApi = await fetch(`${baseProxy}/api/prueba?filtro=activo`);
    assert.equal(resApi.status, 200);
    const jsonApi = await resApi.json();
    assert.equal(jsonApi.ok, true);
    assert.equal(rutaRecibida, "/api/prueba?filtro=activo");

    // Caso 3: Intento de traversal hacia /api/.. enviado directamente
    const resTraversal = await new Promise((resolve) => {
      const req = createServer(); // dummy
      const clientReq = import("node:http").then(({ request }) => {
        const r = request({ hostname: "127.0.0.1", port: puertoProxy, path: "/api/%2e%2e/secreto", method: "GET" }, resolve);
        r.end();
      });
    });
    assert.equal(resTraversal.statusCode, 400);

    // Caso 4: Servir archivo estático frontend
    const resIndex = await fetch(`${baseProxy}/`);
    assert.equal(resIndex.status, 200);
    assert.equal(resIndex.headers.get("content-type"), "text/html");
    const html = await resIndex.text();
    assert.match(html, /App Ficticia/);

    // Caso 5: Servir CSS con MIME correcto
    const resCss = await fetch(`${baseProxy}/estilo.css`);
    assert.equal(resCss.status, 200);
    assert.equal(resCss.headers.get("content-type"), "text/css");

    // Caso 6: Traversal en estáticos es denegado (403)
    const resDistTraversal = await new Promise((resolve) => {
      import("node:http").then(({ request }) => {
        const r = request({ hostname: "127.0.0.1", port: puertoProxy, path: "/%2e%2e/archivo.secreto", method: "GET" }, resolve);
        r.end();
      });
    });
    assert.equal(resDistTraversal.statusCode, 403);
  } finally {
    servidorProxy.close();
    backendSimulado.close();
    rmSync(dirTemp, { recursive: true, force: true });
  }
});
