// Plantillas de mensaje del equipo para avisar del resultado de una candidatura.
import { json, token } from '../http.mjs';
import { audit } from '../audit.mjs';

export async function plantillas({ request, data, store, actor }) {
  if (request.method === 'GET')
    return json({ templates: (await store.get('team-templates')) || [] });
  if (request.method === 'PUT') {
    const list = data.templates;
    const valid =
      Array.isArray(list) &&
      list.length <= 10 &&
      list.every(
        (t) =>
          t &&
          typeof t.title === 'string' &&
          typeof t.text === 'string' &&
          t.title.trim() &&
          t.text.trim() &&
          t.title.trim().length <= 60 &&
          t.text.trim().length <= 1500,
      );
    if (!valid)
      return json({ error: 'Máximo 10 plantillas, título de hasta 60 y texto de hasta 1500.' }, 400);
    const templates = list.map((t) => ({
      id: typeof t.id === 'string' && t.id ? t.id.slice(0, 64) : token().slice(0, 12),
      title: t.title.trim(),
      text: t.text.trim(),
    }));
    await store.put('team-templates', templates);
    await audit(store, actor, 'plantillas-editadas', { detail: String(templates.length) });
    return json({ ok: true, templates });
  }
  return json({ error: 'Solicitud no válida.' }, 400);
}
