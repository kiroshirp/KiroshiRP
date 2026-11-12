// Lectura, guardado y borrado de archivos del repositorio.
import { parse, stringify } from 'yaml';
import { allowedPath, validateContent } from '../content.mjs';
import { clearPublishedDraft } from '../editorial.mjs';
import { json } from '../http.mjs';

const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
const isBinaryPath = (p) => p.startsWith('public/');

async function readFile({ p, repo }) {
  const f = await repo.read(p);
  if (!f) return json({ error: 'No encontrado.' }, 404);
  let document;
  if (p.endsWith('.md')) {
    const text = f.bytes.toString('utf8');
    const match = text.match(FRONT_MATTER);
    if (match) document = { metadata: parse(match[1]), body: text.slice(match[0].length) };
  }
  return json({
    path: p,
    version: f.version,
    content: f.bytes.toString(isBinaryPath(p) ? 'base64' : 'utf8'),
    binary: isBinaryPath(p),
    document,
  });
}

async function removeFile({ p, data, repo, old }) {
  if (p.startsWith('src/data/'))
    return json({ error: 'Los archivos centrales se pueden editar, pero no eliminar.' }, 400);
  if (data.confirm !== p) return json({ error: 'Confirma la ruta exacta para eliminar.' }, 400);
  if (!old) return json({ error: 'No encontrado.' }, 404);
  await repo.remove(p, old.version);
  return json({ ok: true });
}

async function writeFile({ p, data, repo, store, old }) {
  if (data.document && p.endsWith('.md')) {
    if (
      typeof data.document.body !== 'string' ||
      !data.document.metadata ||
      typeof data.document.metadata !== 'object'
    )
      return json({ error: 'Documento no válido.' }, 400);
    data.content = '---\n' + stringify(data.document.metadata) + '---\n' + data.document.body;
  }
  if (typeof data.content !== 'string') return json({ error: 'Falta el contenido.' }, 400);
  const bytes = Buffer.from(data.content, isBinaryPath(p) ? 'base64' : 'utf8');
  validateContent(p, bytes, old?.bytes);
  const result = await repo.write(p, bytes, old?.version);
  await clearPublishedDraft(store, p, data.draftRevision);
  return json({ ok: true, ...result });
}

export async function files({ request, url, data, repo, store }) {
  const mutating = request.method !== 'GET';
  const p = mutating ? data.path : url.searchParams.get('path');
  if (!allowedPath(p)) return json({ error: 'Ruta no permitida.' }, 400);
  if (request.method === 'GET') return readFile({ p, repo });
  if (!['PUT', 'DELETE'].includes(request.method))
    return json({ error: 'Método no permitido.' }, 405);
  const old = await repo.read(p);
  if ((old?.version || '') !== (data.version || ''))
    return json({ error: 'El archivo ha cambiado. Vuelve a cargarlo antes de guardar.' }, 409);
  return request.method === 'DELETE'
    ? removeFile({ p, data, repo, old })
    : writeFile({ p, data, repo, store, old });
}
