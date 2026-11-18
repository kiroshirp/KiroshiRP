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
    const [sheet, team, note] = await Promise.all([
      store.get('character-sheet:' + detail),
      store.get('team-application:' + detail),
      store.get('admin-note:' + detail),
    ]);
    const visible = new Set(fichaOutline.flatMap((s) => s.fields.map((f) => f.id)));
    return json({
      note: note ? { text: note.text, by: note.by, at: note.at } : null,
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
        hasNote: Boolean(await store.get('admin-note:' + id)),
      });
    }
    items.sort((a, b) =>
      (b.lastLogin || b.since || '').localeCompare(a.lastLogin || a.since || ''),
    );
    return json({ items });
  }
  // Nota interna del equipo: solo la ve el panel; nunca se incluye en lo que descarga la persona.
  if (request.method === 'PUT' && isId(data.discordId)) {
    const account = await store.get('account:' + data.discordId);
    const text = typeof data.note === 'string' ? data.note.trim() : '';
    if (!account) return json({ error: 'Cuenta no encontrada.' }, 404);
    if (text.length > 2000) return json({ error: 'La nota admite 2000 caracteres.' }, 400);
    if (text)
      await store.put('admin-note:' + data.discordId, {
        text,
        by: actor.name,
        at: new Date().toISOString(),
      });
    else await store.delete('admin-note:' + data.discordId);
    await audit(store, actor, 'nota-editada', { id: data.discordId, name: account.name || null });
    return json({ ok: true });
  }
  if (request.method === 'DELETE' && isId(data.discordId)) {
    const name = (await store.get('account:' + data.discordId))?.name || null;
    await wipeAccount(store, data.discordId);
    await audit(store, actor, 'cuenta-eliminada', { id: data.discordId, name });
    return json({ ok: true });
  }
  return json({ error: 'Solicitud no válida.' }, 400);
}
