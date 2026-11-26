// Solicitudes del equipo enviadas desde Mi cuenta: listado, revisión y eliminación.
import { json } from '../http.mjs';
import { teamSections } from '../team-form.mjs';
import { audit } from '../audit.mjs';

const labels = Object.fromEntries(
  teamSections.flatMap((s) => s.fields).map((f) => [f.id, f.label]),
);
const STATUSES = ['pendiente', 'aceptada', 'rechazada'];
const INTERNALS = ['en-revision', 'entrevista', 'en-espera'];
const isId = (value) => /^\d{17,20}$/.test(value || '');

export async function equipo({ request, data, store, actor, notify }) {
  if (request.method === 'GET') {
    const ids = (await store.get('team-index')) || [];
    const items = [];
    const kept = [];
    for (const id of ids) {
      const record = await store.get('team-application:' + id);
      if (!record) continue;
      kept.push(id);
      items.push({
        discordId: id,
        discordName: record.discordName,
        createdAt: record.createdAt,
        status: record.status || 'pendiente',
        internal: record.internal || null,
        reviewer: record.reviewer || null,
        note: record.note || null,
        answers: record.answers,
      });
    }
    if (kept.length !== ids.length) await store.put('team-index', kept);
    const templates = (await store.get('team-templates')) || [];
    return json({ items, labels, templates, internals: INTERNALS });
  }
  const key = 'team-application:' + data.discordId;
  const record = isId(data.discordId) ? await store.get(key) : null;
  if (request.method === 'PUT' && record) {
    const str = (v) => (typeof v === 'string' ? v.trim() : v);
    const { status, internal, reviewer, note, message } = data;
    const bad =
      (status !== undefined && !STATUSES.includes(status)) ||
      (internal !== undefined && internal !== '' && !INTERNALS.includes(internal)) ||
      (reviewer !== undefined && reviewer !== true && typeof reviewer !== 'string') ||
      (note !== undefined && (typeof note !== 'string' || note.trim().length > 1000)) ||
      (message !== undefined && (typeof message !== 'string' || message.trim().length > 1500)) ||
      (reviewer || '').length > 100;
    if (bad) return json({ error: 'Datos de la candidatura no válidos.' }, 400);
    const next = { ...record };
    const target = { id: data.discordId, name: record.discordName };
    const logs = [];
    const statusChanged = status !== undefined && (record.status || 'pendiente') !== status;
    if (status !== undefined) {
      next.status = status;
      next.reviewedAt = new Date().toISOString();
      logs.push(['candidatura-estado', status]);
    }
    if (internal !== undefined) {
      if (internal) next.internal = internal;
      else delete next.internal;
      logs.push(['candidatura-interno', internal || null]);
    }
    if (reviewer !== undefined) {
      const name = reviewer === true ? actor.name : str(reviewer);
      if (name) next.reviewer = name;
      else delete next.reviewer;
      logs.push(['candidatura-revisor', name || null]);
    }
    if (note !== undefined) {
      if (str(note)) next.note = { text: str(note), by: actor.name, at: new Date().toISOString() };
      else delete next.note;
      logs.push(['candidatura-nota', null]);
    }
    await store.put(key, next);
    for (const [action, detail] of logs)
      await audit(store, actor, action, detail ? { ...target, detail } : target);
    // Solo avisa si el estado cambia de verdad.
    const text = str(message)?.replaceAll('{nombre}', record.discordName || '') || undefined;
    const notified = statusChanged && notify ? await notify(data.discordId, status, text) : false;
    return json({ ok: true, notified });
  }
  if (request.method === 'DELETE' && isId(data.discordId)) {
    if (!record) return json({ error: 'Solicitud no encontrada.' }, 404);
    await store.delete(key);
    await audit(store, actor, 'candidatura-eliminada', {
      id: data.discordId,
      name: record.discordName,
    });
    const ids = (await store.get('team-index')) || [];
    await store.put(
      'team-index',
      ids.filter((id) => id !== data.discordId),
    );
    return json({ ok: true });
  }
  return json({ error: 'Solicitud no válida.' }, 400);
}
