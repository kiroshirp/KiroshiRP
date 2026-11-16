// Solicitudes del equipo enviadas desde Mi cuenta: listado y eliminación.
import { json } from '../http.mjs';
import { teamSections } from '../team-form.mjs';

const labels = Object.fromEntries(
  teamSections.flatMap((s) => s.fields).map((f) => [f.id, f.label]),
);

export async function equipo({ request, data, store }) {
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
        answers: record.answers,
      });
    }
    if (kept.length !== ids.length) await store.put('team-index', kept);
    return json({ items, labels });
  }
  if (request.method === 'DELETE' && /^\d{17,20}$/.test(data.discordId || '')) {
    const record = await store.get('team-application:' + data.discordId);
    if (!record) return json({ error: 'Solicitud no encontrada.' }, 404);
    await store.delete('team-application:' + data.discordId);
    const ids = (await store.get('team-index')) || [];
    await store.put(
      'team-index',
      ids.filter((id) => id !== data.discordId),
    );
    return json({ ok: true });
  }
  return json({ error: 'Solicitud no válida.' }, 400);
}
