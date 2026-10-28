export function descargarBlob(blob: Blob, nombreArchivo: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export function extraerNombreArchivo(disposition: string | null): string | null {
  if (!disposition) return null;
  const matchUtf8 = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (matchUtf8?.[1]) {
    try {
      return decodeURIComponent(matchUtf8[1].trim().replace(/^["']|["']$/g, ''));
    } catch {
      // Si la decodificación falla, continúa con el fallback
    }
  }
  const match = disposition.match(/filename="?([^";]+)"?/i);
  return match?.[1]?.trim() ?? null;
}
