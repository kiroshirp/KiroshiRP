import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createService } from '../service.mjs';
import { createAccessService } from '../access.mjs';
import { notifyStatus } from '../notify.mjs';

const origin = 'https://admin.example.test';
const staff = '111111111111111111';
const player = '222222222222222222';

function setup() {
  const records = new Map();
  const store = {
    get: async (k) => records.get(k),
    put: async (k, v) => void records.set(k, v),
    delete: async (k) => void records.delete(k),
    list: async ({ prefix }) => new Map([...records].filter(([k]) => k.startsWith(prefix))),
  };
  const env = {
    DISCORD_CLIENT_ID: '123456789012345678',
    DISCORD_CLIENT_SECRET: 's',
    DISCORD_BOT_TOKEN: 'bot',
    DISCORD_INVITE_CHANNEL_ID: '234567890123456789',
    ADMIN_DISCORD_IDS: staff,
  };
  let who = { id: staff, global_name: 'Ana', username: 'ana' };
  const calls = [];
  const fetcher = async (url, init) => {
    if (url.endsWith('/oauth2/token')) return Response.json({ access_token: 't' });
    if (url.endsWith('/users/@me')) return Response.json(who);
    calls.push([url, init?.body]);
    if (url.endsWith('/users/@me/channels')) return Response.json({ id: '999' });
    return Response.json({});
  };
  const assets = async (p) => new Response(p);
  const access = createAccessService({ env, store, assets, fetcher });
  const admin = createService({ env, store, assets, fetcher });
  const call = async (path, options = {}) => {
    const request = new Request(origin + path, options);
    return (await access(request)) || admin(request);
  };
  return { records, call, calls, as: (u) => (who = u) };
}

async function login(s, entry) {
  const start = await s.call(entry);
  const state = new URL(start.headers.get('location')).searchParams.get('state');
  const oauth = /(__Host-krp_oauth=[a-f0-9]{64})/.exec(start.headers.get('set-cookie'))[1];
  return s.call('/acceso/callback?code=good&state=' + state, { headers: { Cookie: oauth } });
}
const cookieOf = (r, name) => new RegExp(`(__Host-${name}=[a-f0-9]{64})`).exec(r.headers.get('set-cookie'))[1];
const post = (s, cookie, path, body, extra = {}) =>
  s.call(path, {
    method: 'POST',
    headers: { Cookie: cookie, Origin: origin, 'Content-Type': 'application/json', ...extra },
    body: JSON.stringify(body),
  });

test('Descargar mis datos incluye la ficha y no las notas del equipo', async () => {
  const s = setup();
  s.as({ id: player, global_name: 'Jugador', username: 'j' });
  const cookie = cookieOf(await login(s, '/cuenta/login'), 'krp_access');
  await post(s, cookie, '/cuenta/api/character', { values: { alias: 'V', secretos: 'oculto' } });
  s.records.set('admin-note:' + player, { text: 'nota del equipo', by: 'Ana', at: 'x' });
  const res = await s.call('/cuenta/api/export', { headers: { Cookie: cookie } });
  assert.match(res.headers.get('content-disposition'), /attachment/);
  const text = await res.text();
  const data = JSON.parse(text);
  assert.equal(data.cuenta.id, player);
  assert.equal(data.fichas[0].values.secretos, 'oculto');
  assert.ok(!text.includes('nota del equipo'));
  assert.equal((await s.call('/cuenta/api/export')).status, 401);
});

test('El historial de la ficha guarda versiones y el límite corta los guardados masivos', async () => {
  const s = setup();
  s.as({ id: player, global_name: 'Jugador', username: 'j' });
  const cookie = cookieOf(await login(s, '/cuenta/login'), 'krp_access');
  const key = 'character-sheet:' + player;
  await post(s, cookie, '/cuenta/api/character', { values: { alias: 'A' } });
  // Hace falta más de 10 minutos entre versiones para que se conserve la anterior.
  s.records.set(key, { ...s.records.get(key), updatedAt: new Date(Date.now() - 3600000).toISOString() });
  await post(s, cookie, '/cuenta/api/character', { values: { alias: 'B' } });
  assert.deepEqual(s.records.get(key).history.map((h) => h.values.alias), ['A']);
  await post(s, cookie, '/cuenta/api/character', { values: { alias: 'C' } });
  assert.equal(s.records.get(key).history.length, 2);
  await post(s, cookie, '/cuenta/api/character', { values: { alias: 'D' } });
  assert.equal(s.records.get(key).history.length, 2, 'cambios seguidos no llenan el historial');
  let last;
  for (let i = 0; i < 40; i++) last = await post(s, cookie, '/cuenta/api/character', { values: { alias: 'x' + i } });
  assert.equal(last.status, 429);
});

test('Las notas internas se guardan, las ve el equipo y se borran con la cuenta', async () => {
  const s = setup();
  s.records.set('account:' + player, { name: 'Jugador', since: 'x' });
  const admin = cookieOf(await login(s, '/admin/entrar'), 'krp_admin');
  const { csrf } = await (await s.call('/admin/api/session', { headers: { Cookie: admin } })).json();
  const put = (body) =>
    s.call('/admin/api/usuarios', {
      method: 'PUT',
      headers: { Cookie: admin, Origin: origin, 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
      body: JSON.stringify(body),
    });
  assert.equal((await put({ discordId: player, note: 'Pidió cambio de nombre' })).status, 200);
  const detail = await (await s.call('/admin/api/usuarios?id=' + player, { headers: { Cookie: admin } })).json();
  assert.equal(detail.note.text, 'Pidió cambio de nombre');
  assert.equal(detail.note.by, 'Ana');
  assert.equal((await put({ discordId: player, note: 'x'.repeat(2001) })).status, 400);
  const list = await (await s.call('/admin/api/usuarios', { headers: { Cookie: admin } })).json();
  assert.equal(list.items[0].hasNote, true);
  await s.call('/admin/api/usuarios', {
    method: 'DELETE',
    headers: { Cookie: admin, Origin: origin, 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
    body: JSON.stringify({ discordId: player }),
  });
  assert.equal(s.records.has('admin-note:' + player), false);
});

test('Cambiar el estado de una candidatura avisa por MD solo si cambia de verdad', async () => {
  const s = setup();
  s.records.set('account:' + player, { name: 'Jugador', since: 'x' });
  s.records.set('team-application:' + player, { discordName: 'Jugador', createdAt: 'x', answers: {} });
  s.records.set('team-index', [player]);
  const admin = cookieOf(await login(s, '/admin/entrar'), 'krp_admin');
  const { csrf } = await (await s.call('/admin/api/session', { headers: { Cookie: admin } })).json();
  const put = (status) =>
    s.call('/admin/api/equipo', {
      method: 'PUT',
      headers: { Cookie: admin, Origin: origin, 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
      body: JSON.stringify({ discordId: player, status }),
    });
  assert.equal((await (await put('aceptada')).json()).notified, true);
  assert.equal(s.calls.length, 2);
  assert.match(s.calls[1][1], /aceptada/);
  assert.equal((await (await put('aceptada')).json()).notified, false);
  assert.equal(s.calls.length, 2);
});

test('Si Discord falla el aviso no rompe nada', async () => {
  const failing = async () => {
    throw new Error('red');
  };
  assert.equal(await notifyStatus({ env: { DISCORD_BOT_TOKEN: 'b' }, fetcher: failing }, player, 'aceptada'), false);
  assert.equal(await notifyStatus({ env: {}, fetcher: failing }, player, 'aceptada'), false);
  assert.equal(await notifyStatus({ env: { DISCORD_BOT_TOKEN: 'b' }, fetcher: failing }, player, 'pendiente'), false);
});

test('Una cuenta puede tener hasta 3 personajes independientes y se borran juntos', async () => {
  const s = setup();
  s.as({ id: player, global_name: 'Jugador', username: 'j' });
  const cookie = cookieOf(await login(s, '/cuenta/login'), 'krp_access');
  for (const slot of [1, 2, 3])
    assert.equal((await post(s, cookie, '/cuenta/api/character', { slot, values: { alias: 'P' + slot } })).status, 200);
  assert.equal((await post(s, cookie, '/cuenta/api/character', { slot: 4, values: {} })).status, 400);
  const get = async (slot) =>
    (await (await s.call('/cuenta/api/character?slot=' + slot, { headers: { Cookie: cookie } })).json()).sheet;
  assert.equal((await get(2)).values.alias, 'P2');
  assert.equal((await get(1)).values.alias, 'P1');
  assert.equal((await s.call('/cuenta/api/character?slot=9', { headers: { Cookie: cookie } })).status, 400);
  const info = await (await s.call('/cuenta/api/session', { headers: { Cookie: cookie } })).json();
  assert.deepEqual(info.characters.map((c) => c.alias), ['P1', 'P2', 'P3']);
  await post(s, cookie, '/cuenta/api/character-delete', { slot: 2 });
  assert.equal(await get(2), null);
  assert.equal((await get(3)).values.alias, 'P3');
  const data = await (await s.call('/cuenta/api/export', { headers: { Cookie: cookie } })).json();
  assert.deepEqual(data.fichas.map((f) => f.personaje), [1, 3]);
  await post(s, cookie, '/cuenta/api/account-delete', {});
  assert.deepEqual([...s.records.keys()].filter((k) => k.startsWith('character-sheet:')), []);
});
