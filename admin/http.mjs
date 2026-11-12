// Utilidades HTTP compartidas por el panel: respuestas JSON, cabeceras de seguridad y hashes.
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';

export const MAX_BODY = 6000000;

export const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...extra },
  });

export const hash = (v) => createHash('sha256').update(String(v)).digest();
export const hashHex = (v) => hash(v).toString('hex');
export const equal = (a, b) => timingSafeEqual(hash(a), hash(b));
export const token = () => randomBytes(32).toString('hex');

// Añade a cada respuesta las cabeceras de seguridad del panel.
export function finish(response) {
  const h = new Headers(response.headers);
  h.set('Cache-Control', 'no-store');
  h.set('X-Robots-Tag', 'noindex, nofollow');
  h.set('X-Content-Type-Options', 'nosniff');
  h.set('Referrer-Policy', 'no-referrer');
  h.set('X-Frame-Options', 'DENY');
  h.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
  );
  return new Response(response.body, { status: response.status, headers: h });
}

// Lee el cuerpo JSON con límite de tamaño. Devuelve { data } o { response } si hay que cortar.
export async function readJson(request) {
  if (Number(request.headers.get('content-length')) > MAX_BODY)
    return { response: json({ error: 'Solicitud demasiado grande.' }, 413) };
  const reader = request.body?.getReader();
  let size = 0;
  const chunks = [];
  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_BODY) {
        await reader.cancel();
        return { response: json({ error: 'Solicitud demasiado grande.' }, 413) };
      }
      chunks.push(Buffer.from(value));
    }
  }
  try {
    return { data: JSON.parse(Buffer.concat(chunks).toString('utf8')) };
  } catch {
    return { response: json({ error: 'JSON no válido.' }, 400) };
  }
}
