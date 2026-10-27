// Servidor HTTP efímero unificado y seguro para pruebas E2E (ADR-0031).
// Sirve archivos estáticos del frontend y reenvía /api/ y /health al backend
// en 127.0.0.1 garantizando un único origen sin vulnerabilidades de SSRF.

import { createServer, request } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { resolve, extname, sep } from "node:path";

/**
 * Valida si una URL entrante corresponde a una ruta permitida para el proxy de la API.
 * Bloquea intentos de manipulación de host (SSRF), URLs absolutas hacia terceros,
 * rutas relativas de protocolo (//) y secuencias de escape o path traversal.
 *
 * @param {string} urlEntrante - URL relativa de la petición entrante (peticion.url)
 * @returns {{ esValida: boolean, pathname?: string, search?: string, motivo?: string }}
 */
export function validarRutaProxy(urlEntrante) {
  if (!urlEntrante || typeof urlEntrante !== "string") {
    return { esValida: false, motivo: "URL no provista o tipo inválido" };
  }

  // Rechazar esquemas absolutos o rutas de protocolo relativo
  if (urlEntrante.startsWith("//") || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(urlEntrante)) {
    return { esValida: false, motivo: "Esquema absoluto o relativo de protocolo no permitido" };
  }

  let parsed;
  try {
    parsed = new URL(urlEntrante, "http://127.0.0.1");
  } catch {
    return { esValida: false, motivo: "Formato de URL inválido" };
  }

  // El origen resuelto debe coincidir estrictamente con el host base local
  if (parsed.origin !== "http://127.0.0.1") {
    return { esValida: false, motivo: "Origen modificado respecto al origen local" };
  }

  const pathname = parsed.pathname;

  // Comprobar path traversal o caracteres peligrosos en la ruta
  if (pathname.includes("..") || /%(?:2e|2f|5c)/i.test(urlEntrante)) {
    return { esValida: false, motivo: "Secuencia de escape o directory traversal detectada" };
  }

  // Permitir únicamente rutas bajo /api/ o el endpoint exacto /health
  const esRutaPermitida = pathname === "/health" || pathname.startsWith("/api/");
  if (!esRutaPermitida) {
    return { esValida: false, motivo: "Ruta no permitida para el proxy de API" };
  }

  return {
    esValida: true,
    pathname,
    search: parsed.search || "",
  };
}

const TIPOS_MIME = {
  ".js": "text/javascript",
  ".css": "text/css",
  ".html": "text/html",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".json": "application/json",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

/**
 * Crea y configura una instancia de servidor HTTP para pruebas E2E.
 *
 * @param {object} opciones
 * @param {number|string} opciones.puertoBackend - Puerto numérico donde escucha la API backend en 127.0.0.1
 * @param {string} [opciones.rutaDist] - Ruta al directorio dist del frontend SPA
 * @returns {import("node:http").Server}
 */
export function crearServidorPruebasE2E({ puertoBackend, rutaDist }) {
  const puertoNum = Number(puertoBackend);
  if (!puertoNum || puertoNum <= 0 || puertoNum > 65535) {
    throw new Error(`Puerto de backend inválido: ${puertoBackend}`);
  }

  const dist = rutaDist ? resolve(rutaDist) : resolve("src/Frontend/dist/Frontend/browser");

  return createServer((peticion, respuesta) => {
    const urlEntrante = peticion.url || "/";

    // 1. Si coincide con prefijo /api/ o /health, evaluar proxy
    if (urlEntrante.startsWith("/api/") || urlEntrante === "/health" || urlEntrante.startsWith("/health?")) {
      const validacion = validarRutaProxy(urlEntrante);
      if (!validacion.esValida) {
        respuesta.writeHead(400, { "Content-Type": "application/json" });
        respuesta.end(JSON.stringify({ error: "Petición no permitida", detalle: validacion.motivo }));
        return;
      }

      const rutaDestino = `${validacion.pathname}${validacion.search}`;
      const cabecerasProxy = { ...peticion.headers };
      cabecerasProxy.host = `127.0.0.1:${puertoNum}`;

      // Configuración de destino con host fijo en loopback (prevención SSRF)
      const opcionesProxy = {
        hostname: "127.0.0.1",
        port: puertoNum,
        path: rutaDestino,
        method: peticion.method,
        headers: cabecerasProxy,
      };

      const proxy = request(opcionesProxy, (remota) => {
        respuesta.writeHead(remota.statusCode, remota.headers);
        remota.pipe(respuesta);
      });

      proxy.on("error", () => {
        if (!respuesta.headersSent) {
          respuesta.writeHead(502, { "Content-Type": "application/json" });
          respuesta.end(JSON.stringify({ error: "Error de conexión con el backend local" }));
        }
      });

      peticion.pipe(proxy);
      return;
    }

    // 2. Servir estáticos del frontend
    if (urlEntrante.includes("..") || /%(?:2e|2f|5c)/i.test(urlEntrante)) {
      respuesta.writeHead(403);
      respuesta.end("Acceso denegado");
      return;
    }

    let pathnameLimpio = "/";
    try {
      pathnameLimpio = decodeURIComponent(new URL(urlEntrante, "http://127.0.0.1").pathname);
    } catch {
      respuesta.writeHead(400);
      respuesta.end("Ruta inválida");
      return;
    }

    const ruta = resolve(dist, `.${pathnameLimpio}`);
    if (!ruta.startsWith(dist + sep) && ruta !== dist) {
      respuesta.writeHead(403);
      respuesta.end("Acceso denegado");
      return;
    }

    try {
      const archivo = existsSync(ruta) && extname(ruta) ? ruta : `${dist}/index.html`;
      if (!existsSync(archivo)) {
        respuesta.writeHead(404);
        respuesta.end("Archivo no encontrado");
        return;
      }
      const tipo = TIPOS_MIME[extname(archivo)] || "application/octet-stream";
      respuesta.setHeader("Content-Type", tipo);
      respuesta.end(readFileSync(archivo));
    } catch {
      if (!respuesta.headersSent) {
        respuesta.writeHead(404);
        respuesta.end();
      }
    }
  });
}
