import assert from "node:assert/strict";
import { createServer, request } from "node:http";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { crearServidorPruebas } from "../servidor-pruebas-e2e.mjs";

console.log("Iniciando pruebas unitarias de crearServidorPruebas...");

// 1. Crear entorno temporal con index.html y assets
const tempDir = mkdtempSync(join(tmpdir(), "test-dist-"));
writeFileSync(join(tempDir, "index.html"), "<html><body>SPA App</body></html>");
writeFileSync(join(tempDir, "estilo.css"), "body { color: red; }");

// 2. Levantar servidor backend mock
let peticionRecibida = null;
const backendMock = createServer((req, res) => {
  peticionRecibida = {
    method: req.method,
    url: req.url,
    headers: req.headers,
  };
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ estado: "ok" }));
    return;
  }
  if (req.url.startsWith("/api/prueba")) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ mensaje: "api ok" }));
    return;
  }
  res.writeHead(404);
  res.end();
});

await new Promise((listo) => backendMock.listen(0, "127.0.0.1", listo));
const backendPuerto = backendMock.address().port;
const backendUrl = `http://127.0.0.1:${backendPuerto}`;

// 3. Crear y levantar servidor de pruebas
const servidorProxy = crearServidorPruebas({
  backend: backendUrl,
  dist: tempDir,
});
await new Promise((listo) => servidorProxy.listen(0, "127.0.0.1", listo));
const proxyPuerto = servidorProxy.address().port;
const proxyBase = `http://127.0.0.1:${proxyPuerto}`;

try {
  // Test 1: Proxy legítimo /health
  {
    const res = await fetch(`${proxyBase}/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.estado, "ok");
    assert.equal(peticionRecibida.url, "/health");
    console.log("✓ Caso 1: /health proxy exitoso.");
  }

  // Test 2: Proxy legítimo /api/prueba con query params
  {
    const res = await fetch(`${proxyBase}/api/prueba?filtro=activo`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.mensaje, "api ok");
    assert.equal(peticionRecibida.url, "/api/prueba?filtro=activo");
    console.log("✓ Caso 2: /api/prueba con query params proxy exitoso.");
  }

  // Test 3: Rechazar URL absoluta maliciosa con esquema
  {
    // Usamos raw http request para enviar una ruta maliciosa en la linea de peticion
    const rawReq = await new Promise((resolve) => {
      const req = request(
        {
          hostname: "127.0.0.1",
          port: proxyPuerto,
          path: "http://malicious-host.com/api/robocuentas",
          method: "GET",
        },
        (res) => resolve(res.statusCode),
      );
      req.end();
    });
    assert.equal(rawReq, 400, "Debe rechazar URLs que no comiencen con /");
    console.log("✓ Caso 3: URL absoluta externa rechazada con 400.");
  }

  // Test 4: Rechazar esquema protocol-relative //evil.com
  {
    const rawReq = await new Promise((resolve) => {
      const req = request(
        {
          hostname: "127.0.0.1",
          port: proxyPuerto,
          path: "//evil.com/api/test",
          method: "GET",
        },
        (res) => resolve(res.statusCode),
      );
      req.end();
    });
    assert.equal(rawReq, 400, "Debe rechazar URLs protocol-relative (//)");
    console.log("✓ Caso 4: Protocol-relative URL rechazada con 400.");
  }

  // Test 5: Servir archivo estático legítimo
  {
    const res = await fetch(`${proxyBase}/estilo.css`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("Content-Type"), "text/css");
    const text = await res.text();
    assert.equal(text, "body { color: red; }");
    console.log("✓ Caso 5: Archivo estático servido correctamente.");
  }

  // Test 6: Fallback SPA a index.html para rutas no-API
  {
    const res = await fetch(`${proxyBase}/usuario/hoja-de-vida`);
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.match(text, /SPA App/);
    console.log("✓ Caso 6: Fallback SPA a index.html funcionando.");
  }

  // Test 7: Prevenir Path Traversal en archivos estáticos
  {
    const rawReq = await new Promise((resolve) => {
      const req = request(
        {
          hostname: "127.0.0.1",
          port: proxyPuerto,
          path: "/../../../etc/passwd",
          method: "GET",
        },
        (res) => resolve(res.statusCode),
      );
      req.end();
    });
    assert(rawReq === 403 || rawReq === 400, "Path traversal debe ser bloqueado con 403 o 400");
    console.log("✓ Caso 7: Intento de Path Traversal bloqueado.");
  }

  // Test 8: Proxy POST con cabeceras y cuerpo
  {
    const res = await fetch(`${proxyBase}/api/prueba`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Cookie": "istpet_auth=abc" },
      body: JSON.stringify({ dato: 123 }),
    });
    assert.equal(res.status, 200);
    assert.equal(peticionRecibida.method, "POST");
    assert.equal(peticionRecibida.headers["cookie"], "istpet_auth=abc");
    console.log("✓ Caso 8: POST con headers y body proxificado correctamente.");
  }

  // Test 9: Comportamiento ante backend caído (502 Bad Gateway)
  {
    const servidorCaido = crearServidorPruebas({
      backend: "http://127.0.0.1:59999", // Puerto sin servicio activo
      dist: tempDir,
    });
    await new Promise((listo) => servidorCaido.listen(0, "127.0.0.1", listo));
    const caidoPuerto = servidorCaido.address().port;
    try {
      const res = await fetch(`http://127.0.0.1:${caidoPuerto}/api/prueba`);
      assert.equal(res.status, 502);
      console.log("✓ Caso 9: Error 502 ante backend inaccesible.");
    } finally {
      await new Promise((listo) => servidorCaido.close(listo));
    }
  }

  console.log("Todas las pruebas de crearServidorPruebas pasaron con éxito.");
} finally {
  await new Promise((listo) => servidorProxy.close(listo));
  await new Promise((listo) => backendMock.close(listo));
  rmSync(tempDir, { recursive: true, force: true });
}
