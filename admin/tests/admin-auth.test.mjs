import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createService } from '../service.mjs';
import { createAccessService } from '../access.mjs';

const origin = 'https://admin.example.test';
const staff = '111111111111111111';
const stranger = '999999999999999999';
const player = '222222222222222222';

function setup(extraEnv = {}) {
  const records = new Map();
  const store = {
    async get(k) {
      return records.get(k);
    },
    async put(k, v) {
      records.set(k, v);
    },
    async delete(k) {
      records.delete(k);
    },
    async list({ prefix }) {
      return new Map([...records].filter(([k]) => k.startsWith(prefix)));
    },
  };
  const env = {
    ADMIN_USERNAME: 'equipo',
    ADMIN_PASSWORD: 'contrasena-muy-larga-123',
    DISCORD_CLIENT_ID: '123456789012345678',
    DISCORD_CLIENT_SECRET: 'secreto',
    DISCORD_BOT_TOKEN: 'bot',
    DISCORD_INVITE_CHANNEL_ID: '234567890123456789',
    ADMIN_DISCORD_IDS: staff,
    ...extraEnv,
  };
  let discordUser = { id: staff, global_name: 'Ana Staff', username: 'ana' };
  const fetcher = async (url) => {
    if (url.endsWith('/oauth2/token')) return Response.json({ access_token: 'token' });
    if (url.endsWith('/users/@me')) return Response.json(discordUser);
    throw new Error('URL inesperada');
  };
  const assets = async (path) => new Response(path);
  const access = createAccessService({ env, store, assets, fetcher });
  const admin = createService({ env, store, assets });
  const call = async (path, options = {}) => {
    const request = new Request(origin + path, options);
    return (await access(request)) || admin(request);
  };
  return { records, env, call, as: (user) => (discordUser = user) };
}

async function discordLogin(s) {
  const start = await s.call('/admin/entrar');
  assert.equal(start.status, 302);
  const state = new URL(start.headers.get('location')).searchParams.get('state');
  const oauth = /(__Host-krp_oauth=[a-f0-9]{64})/.exec(start.headers.get('set-cookie'))[1];
  return s.call('/acceso/callback?code=good&state=' + state, { headers: { Cookie: oauth } });
}
const adminCookie = (response) =>
  /(__Host-krp_admin=[a-f0-9]{64})/.exec(response.headers.get('set-cookie') || '')?.[1];
const api = (s, cookie, path, method = 'GET', body, csrf = '') =>
  s.call('/admin/api/' + path, {
    method,
    headers: {
      Cookie: cookie,
      ...(method !== 'GET'
        ? { Origin: origin, 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }
        : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

test('El panel informa de qué formas de entrar hay activas', async () => {
  const both = await (await setup().call('/admin/api/auth')).json();
  assert.deepEqual(both, { discord: true, password: true });
  const noDiscord = await (await setup({ ADMIN_DISCORD_IDS: '' }).call('/admin/api/auth')).json();
  assert.deepEqual(noDiscord, { discord: false, password: true });
  const off = await (await setup({ ADMIN_PASSWORD_LOGIN: 'off' }).call('/admin/api/auth')).json();
  assert.deepEqual(off, { discord: true, password: false });
  const none = setup({ ADMIN_DISCORD_IDS: '', ADMIN_PASSWORD: '' });
  assert.equal((await none.call('/admin/api/session')).status, 503);
});
test('Con la contraseña desactivada no se puede entrar con ella', async () => {
  const s = setup({ ADMIN_PASSWORD_LOGIN: 'off' });
  const response = await s.call('/admin/api/login', {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'equipo', password: 'contrasena-muy-larga-123' }),
  });
  assert.equal(response.status, 403);
});
test('Solo los IDs de Discord autorizados entran en el panel', async () => {
  const s = setup();
  const ok = await discordLogin(s);
  assert.equal(ok.status, 302);
  assert.equal(ok.headers.get('location'), '/admin/');
  const cookie = adminCookie(ok);
  assert.ok(cookie);
  const session = await (await api(s, cookie, 'session')).json();
  assert.ok(session.csrf);
  assert.deepEqual(session.actor, { name: 'Ana Staff', method: 'discord' });
  s.as({ id: stranger, global_name: 'Intruso', username: 'x' });
  const denied = await discordLogin(s);
  assert.equal(denied.headers.get('location'), '/admin/?error=denegado');
  assert.equal(adminCookie(denied), undefined);
  assert.equal(s.records.has('account:' + stranger), false);
});
test('Quitar a alguien de la lista o apagar la contraseña cierra sus sesiones', async () => {
  const s = setup();
  const cookie = adminCookie(await discordLogin(s));
  assert.equal((await api(s, cookie, 'usuarios')).status, 200);
  s.env.ADMIN_DISCORD_IDS = stranger;
  assert.equal((await api(s, cookie, 'usuarios')).status, 401);
  const p = setup();
  const login = await p.call('/admin/api/login', {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'equipo', password: 'contrasena-muy-larga-123' }),
  });
  const pass = /(__Host-krp_admin=[a-f0-9]{64})/.exec(login.headers.get('set-cookie'))[1];
  assert.equal((await api(p, pass, 'usuarios')).status, 200);
  p.env.ADMIN_PASSWORD_LOGIN = 'off';
  assert.equal((await api(p, pass, 'usuarios')).status, 401);
});
test('El registro anota quién hizo cada acción y solo lo ve el equipo', async () => {
  const s = setup();
  const now = new Date().toISOString();
  s.records.set('account:' + player, { since: now, name: 'Jugador' });
  s.records.set('team-application:' + player, {
    discordName: 'Jugador',
    createdAt: now,
    answers: {},
  });
  s.records.set('team-index', [player]);
  s.records.set('access-application:' + player, {
    discordName: 'Jugador',
    steamId: '76561198000000000',
    createdAt: now,
  });
  s.records.set('access-index', [player]);
  assert.equal((await api(s, 'x', 'registro')).status, 401);
  const cookie = adminCookie(await discordLogin(s));
  const { csrf } = await (await api(s, cookie, 'session')).json();
  await api(s, cookie, 'equipo', 'PUT', { discordId: player, status: 'aceptada' }, csrf);
  await api(s, cookie, 'solicitudes', 'DELETE', { discordId: player }, csrf);
  await api(s, cookie, 'equipo', 'DELETE', { discordId: player }, csrf);
  await api(s, cookie, 'usuarios', 'DELETE', { discordId: player }, csrf);
  const { items } = await (await api(s, cookie, 'registro')).json();
  assert.deepEqual(
    items.map((i) => i.action),
    [
      'cuenta-eliminada',
      'candidatura-eliminada',
      'solicitud-acceso-eliminada',
      'candidatura-estado',
      'inicio-sesion',
    ],
  );
  assert.deepEqual(items[0].actor, { id: staff, name: 'Ana Staff', method: 'discord' });
  assert.deepEqual(items[0].target, { id: player, name: 'Jugador' });
  assert.equal(items[3].target.detail, 'aceptada');
  const stored = [...s.records].find(([k]) => k.startsWith('audit:'))[1];
  assert.ok(stored.expires - Date.now() > 179 * 86400000);
});
