/** Extrae un mensaje legible de errores HTTP del backend (validation map, message, error). */
export function apiErrorMessage(err: any, fallback = 'Error'): string {
  const body = err?.error;
  if (body == null) {
    return err?.message || fallback;
  }
  if (typeof body === 'string') {
    try {
      return apiErrorMessage({ error: JSON.parse(body) }, body || fallback);
    } catch {
      return body || fallback;
    }
  }
  if (typeof body.message === 'string' && body.message.trim()) {
    return body.message;
  }
  if (typeof body.error === 'string' && body.error.trim()) {
    return body.error;
  }
  if (typeof body === 'object') {
    const parts = Object.entries(body)
      .filter(([, v]) => typeof v === 'string' && v.trim())
      .map(([k, v]) => `${k}: ${v}`);
    if (parts.length) return parts.join('\n');
  }
  return fallback;
}
