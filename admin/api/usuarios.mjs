// Cuentas de Discord con sesión iniciada alguna vez: listado y borrado total. Las fichas son privadas:
// solo se informa de su progreso, nunca de su contenido.
import { json } from '../http.mjs';
import { progress } from '../character-form.mjs';
import { wipeAccount } from '../accounts.mjs';

export async function usuarios({ request, data, store }) {
  if (request.method === 'GET') {
    const items = [];
    for (const [key, account] of await store.list({ prefix: 'account:' })) {
      const id = key.slice('account:'.length);
      const [sheet, team, access] = await Promise.all([
        store.get('character-sheet:' + id),
        store.get('team-application:' + id),
        store.get('access-application:' + id),
      ]);
      items.push({
        discordId: id,
        name: account.name || null,
        since: account.since,
        lastLogin: account.lastLogin || null,
        character: sheet ? { progress: progress(sheet.values), updatedAt: sheet.updatedAt } : null,
        team: team ? { status: team.status || 'pendiente', createdAt: team.createdAt } : null,
        access: access ? { steamId: access.steamId, createdAt: access.createdAt } : null,
      });
    }
    items.sort((a, b) =>
      (b.lastLogin || b.since || '').localeCompare(a.lastLogin || a.since || ''),
    );
    return json({ items });
  }
  if (request.method === 'DELETE' && /^\d{17,20}$/.test(data.discordId || '')) {
    await wipeAccount(store, data.discordId);
    return json({ ok: true });
  }
  return json({ error: 'Solicitud no válida.' }, 400);
}
