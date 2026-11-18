// Cuentas de Discord con sesión iniciada alguna vez: listado y borrado total. Las fichas son privadas:
// solo se informa de su progreso, nunca de su contenido.
import { json } from '../http.mjs';
import { characterSections, progress } from '../character-form.mjs';
import { teamSections } from '../team-form.mjs';
import { wipeAccount } from '../accounts.mjs';
import { audit } from '../audit.mjs';

// Secciones con solo id y pregunta, sin los campos privados de la ficha (p. ej. «Secretos»).
const outline = (sections) =>
  sections.map(({ title, fields }) => ({
    title,
    fields: fields.filter((f) => !f.private).map(({ id, label }) => ({ id, label })),
  }));
const fichaOutline = outline(characterSections);
const teamOutline = outline(teamSections);
const isId = (value) => /^[0-9]{17,20}$/.test(value || '');

export async function usuarios({ request, data, store, actor }) {
  const detail = new URL(request.url).searchParams.get('id');
  if (request.method === 'GET' && detail !== null) {
    if (!isId(detail)) return json({ error: 'Cuenta no válida.' }, 400);
    const [sheet, team] = await Promise.all([
      store.get('character-sheet:' + detail),
      store.get('team-application:' + detail),
    ]);
    const visible = new Set(fichaOutline.flatMap((s) => s.fields.map((f) => f.id)));
    return json({
      ficha: sheet
        ? {
            values: Object.fromEntries(
              Object.entries(sheet.values).filter(([id]) => visible.has(id)),
            ),
            images: sheet.images,
            updatedAt: sheet.updatedAt,
          }
        : null,
      team: team
        ? { status: team.status || 'pendiente', createdAt: team.createdAt, answers: team.answers }
        : null,
      sections: { ficha: fichaOutline, team: teamOutline },
    });
  }
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
  if (request.method === 'DELETE' && isId(data.discordId)) {
    const name = (await store.get('account:' + data.discordId))?.name || null;
    await wipeAccount(store, data.discordId);
    await audit(store, actor, 'cuenta-eliminada', { id: data.discordId, name });
    return json({ ok: true });
  }
  return json({ error: 'Solicitud no válida.' }, 400);
}
