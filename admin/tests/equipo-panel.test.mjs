import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createService } from '../service.mjs';
import { createAccessService } from '../access.mjs';
import { characterSections, sheetKeys } from '../character-form.mjs';

const origin = 'https://admin.example.test';
const staff = '111111111111111111';
const p1 = '222222222222222222';
const p2 = '333333333333333333';
const p3 = '444444444444444444';

function setup() {
  const records = new Map();
  const store = {
    get: async (k) => records.get(k),
    put: async (k, v) => void records.set(k, v),
    delete: async (k) => void records.delete(k),
    list: async ({ prefix }) => new Map([...records].filter(([k]) => k.startsWith(prefix))),
  };
  const env = { DISCORD_CLIENT_ID: '123456789012345678', DISCORD_CLIENT_SECRET: 's', DISCORD_BOT_TOKEN: 'bot', DISCORD_INVITE_CHANNEL_ID: '234567890123456789', ADMIN_DISCORD_IDS: staff };
  const calls = [];
  const fetcher = async (url, init) => {
    if (url.endsWith('/oauth2/token')) return Response.json({ access_token: 't' });
    if (url.endsWith('/users/@me')) return Response.json({ id: staff, global_name: 'Ana', username: 'ana' });
    calls.push([url, init?.body]);
    if (url.endsWith('/users/@me/channels')) return Response.json({ id: '999' });
    return Response.json({});
  };
  const assets = async (p) => new Response(p);
  const access = createAccessService({ env, store, assets, fetcher });
  const admin = createService({ env, store, assets, fetcher });
  return {
    records,
    calls,
    call: async (path, options) => {
      const request = new Request(origin + path, options);
      return (await access(request)) || admin(request);
    },
  };
}

async function session(s) {
  const start = await s.call('/admin/entrar');
  const state = new URL(start.headers.get('location')).searchParams.get('state');
  const oauth = /(__Host-krp_oauth=[a-f0-9]{64})/.exec(start.headers.get('set-cookie'))[1];
  const cb = await s.call('/acceso/callback?code=good&state=' + state, { headers: { Cookie: oauth } });
  const cookie = /(__Host-krp_admin=[a-f0-9]{64})/.exec(cb.headers.get('set-cookie'))[1];
  const { csrf } = await (await s.call('/admin/api/session', { headers: { Cookie: cookie } })).json();
  const get = async (path) => (await s.call(path, { headers: { Cookie: cookie } })).json();
  const put = (path, body) =>
    s.call(path, {
      method: 'PUT',
      headers: { Cookie: cookie, Origin: origin, 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
      body: JSON.stringify(body),
    });
  return { get, put };
}

const actions = (s) => [...s.records].filter(([k]) => k.startsWith('audit:')).map(([, v]) => v.action);

test('PUT parcial del equipo, estado interno inválido y aviso solo si cambia el estado', async () => {
  const s = setup();
  s.records.set('team-application:' + p1, { discordName: 'Jugador', createdAt: 'x', answers: {} });
  s.records.set('team-index', [p1]);
  const { get, put } = await session(s);
  const upd = (body) => put('/admin/api/equipo', { discordId: p1, ...body });

  assert.equal((await upd({ internal: 'nada' })).status, 400);
  assert.equal((await upd({ status: 'rara' })).status, 400);
  assert.equal((await upd({ note: 'x'.repeat(1001) })).status, 400);
  assert.equal((await upd({ message: 'x'.repeat(1501) })).status, 400);

  // Parcial: solo estado interno y revisor; no toca el estado ni avisa.
  const res = await (await upd({ internal: 'entrevista', reviewer: true })).json();
  assert.equal(res.notified, false);
  assert.equal(s.calls.length, 0);
  let item = (await get('/admin/api/equipo')).items[0];
  assert.equal(item.internal, 'entrevista');
  assert.equal(item.reviewer, 'Ana');
  assert.equal(item.status, 'pendiente');

  await upd({ note: 'Buen perfil' });
  item = (await get('/admin/api/equipo')).items[0];
  assert.equal(item.note.text, 'Buen perfil');
  assert.equal(item.note.by, 'Ana');
  assert.deepEqual((await get('/admin/api/equipo')).internals, ['en-revision', 'entrevista', 'en-espera']);

  await upd({ internal: '', reviewer: '', note: '' });
  item = (await get('/admin/api/equipo')).items[0];
  assert.deepEqual([item.internal, item.reviewer, item.note], [null, null, null]);

  // Mensaje propio con {nombre}; solo se envía si el estado cambia.
  assert.equal((await (await upd({ status: 'aceptada', message: 'Hola {nombre}, bienvenido' })).json()).notified, true);
  assert.match(s.calls[1][1], /Hola Jugador, bienvenido/);
  assert.equal((await (await upd({ status: 'aceptada', message: 'otro' })).json()).notified, false);
  assert.equal(s.calls.length, 2);

  for (const a of ['candidatura-estado', 'candidatura-interno', 'candidatura-revisor', 'candidatura-nota'])
    assert.ok(actions(s).includes(a), a);
});

test('Las plantillas respetan los límites y se listan con el equipo', async () => {
  const s = setup();
  const { get, put } = await session(s);
  const ok = await put('/admin/api/plantillas', { templates: [{ title: 'Aceptada', text: 'Hola {nombre}' }] });
  assert.equal(ok.status, 200);
  const { templates } = await get('/admin/api/plantillas');
  assert.equal(templates.length, 1);
  assert.ok(templates[0].id);
  assert.deepEqual((await get('/admin/api/equipo')).templates, templates);
  assert.ok(actions(s).includes('plantillas-editadas'));
  const bad = (templates) => put('/admin/api/plantillas', { templates });
  assert.equal((await bad(Array(11).fill({ title: 'a', text: 'b' }))).status, 400);
  assert.equal((await bad([{ title: 'x'.repeat(61), text: 'b' }])).status, 400);
  assert.equal((await bad([{ title: 'a', text: 'x'.repeat(1501) }])).status, 400);
  assert.equal((await bad([])).status, 200);
});

test('Estadísticas: 30 días contiguos, embudo y pendientes baratos', async () => {
  const s = setup();
  const today = new Date().toISOString();
  const full = Object.fromEntries(characterSections.flatMap((x) => x.fields).map((f) => [f.id, 'x']));
  s.records.set('account:' + p1, { name: 'A', since: today });
  s.records.set('account:' + p2, { name: 'B', since: today });
  s.records.set('account:' + p3, { name: 'C', since: '2000-01-01T00:00:00.000Z' });
  s.records.set(sheetKeys(p1)[0], { values: full, updatedAt: today });
  s.records.set(sheetKeys(p2)[0], { values: { alias: 'x' }, updatedAt: today });
  s.records.set('team-application:' + p1, { discordName: 'A', status: 'aceptada' });
  s.records.set('team-application:' + p2, { discordName: 'B' });
  s.records.set('team-index', [p1, p2]);
  const { get } = await session(s);
  const stats = await get('/admin/api/estadisticas');
  assert.equal(stats.days.length, 30);
  assert.equal(stats.days[29].date, today.slice(0, 10));
  assert.equal(stats.days[29].count, 2);
  assert.equal(stats.days[0].count, 0);
  assert.deepEqual(stats.funnel, { discord: 3, ficha: 1, solicitud: 2, aceptada: 1 });
  assert.equal(stats.pendientes, 1);
  assert.deepEqual(await get('/admin/api/estadisticas?solo=pendientes'), { pendientes: 1 });
});
