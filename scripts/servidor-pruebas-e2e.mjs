import assert from "node:assert/strict";
import { createServer, request } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { resolve, extname, sep } from "node:path";

/**
 * Crea un servidor HTTP de pruebas E2E que combina:
 * 1. Proxy inverso seguro hacia el backend local (solo rutas /api/ y /health).
 * 2. Servicio de archivos estáticos del SPA con fallback a index.html.
 *
 * Diseñado con destino fijo (loopback) y validación estricta de rutas para evitar
 * cualquier riesgo de Server-Side Request Forgery (CWE-918).
 */
export function crearServidorPruebas({ backend, dist }) {
  assert(backend, "Se requiere la URL del backend");
  assert(dist, "Se requiere la ruta del directorio dist");
  assert(existsSync(`${dist}/index.html`), "Compile el frontend primero");

  const backendUrl = new URL(backend);
  if (backendUrl.hostname !== "127.0.0.1" && backendUrl.hostname !== "localhost") {
    throw new Error("El backend de pruebas debe residir en loopback (127.0.0.1 o localhost)");
  }

  const tipos = {
    ".js": "text/javascript",
    ".css": "text/css",
    ".html": "text/html",
    ".svg": "image/svg+xml",
    ".png": "image/png",
  };

  return createServer((peticion, respuesta) => {
    const rawUrl = peticion.url;

    // Rechazar peticiones sin URL válida o con esquemas/protocolos absolutos
    if (typeof rawUrl !== "string" || !rawUrl.startsWith("/") || rawUrl.startsWith("//")) {
      respuesta.writeHead(400);
      respuesta.end("Ruta invalida");
      return;
    }

    // Parsear ruta de forma segura con base fija local
    const urlSegura = new URL(rawUrl, "http://127.0.0.1");
    const { pathname, search } = urlSegura;

    // Proxy hacia el backend si corresponde a la API o salud
    if (pathname.startsWith("/api/") || pathname === "/health") {
      const opcionesProxy = {
        protocol: backendUrl.protocol,
        hostname: backendUrl.hostname,
        port: backendUrl.port,
        path: pathname + search,
        method: peticion.method,
        headers: {
          ...peticion.headers,
          host: backendUrl.host,
        },
      };

      const proxy = request(opcionesProxy, (remota) => {
        respuesta.writeHead(remota.statusCode, remota.headers);
        remota.pipe(respuesta);
      });

      proxy.on("error", () => {
        respuesta.writeHead(502);
        respuesta.end();
      });

      peticion.pipe(proxy);
      return;
    }

    // Servir archivos estáticos del frontend
    if (rawUrl.includes("..") || rawUrl.includes("%2e") || rawUrl.includes("%2E")) {
      respuesta.writeHead(403);
      respuesta.end("Acceso denegado");
      return;
    }

    let ruta;
    try {
      ruta = resolve(dist, `.${decodeURIComponent(pathname)}`);
    } catch {
      respuesta.writeHead(400);
      respuesta.end("Ruta malformada");
      return;
    }

    if (!ruta.startsWith(dist + sep) && ruta !== dist) {
      respuesta.writeHead(403);
      respuesta.end();
      return;
    }

    try {
      const archivo = existsSync(ruta) && extname(ruta) ? ruta : `${dist}/index.html`;
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
}
