// Solicitudes de acceso por Discord: listado y eliminación.
import { json } from '../http.mjs';

export async function solicitudes({ request, data, store }) {
  if (request.method === 'GET') {
    const ids = (await store.get('access-index')) || [];
    const items = [];
    for (const id of ids) {
      const record = await store.get('access-application:' + id);
      if (record) items.push(record);
    }
    return json({ items });
  }
  if (request.method === 'DELETE' && /^\d{17,20}$/.test(data.discordId || '')) {
    const record = await store.get('access-application:' + data.discordId);
    if (!record) return json({ error: 'Solicitud no encontrada.' }, 404);
    await store.delete('access-application:' + data.discordId);
    await store.delete('access-steam:' + record.steamId);
    const ids = (await store.get('access-index')) || [];
    await store.put(
      'access-index',
      ids.filter((id) => id !== data.discordId),
    );
    return json({ ok: true });
  }
  return json({ error: 'Solicitud no válida.' }, 400);
}
