import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAccessService } from '../access.mjs';
import { createService } from '../service.mjs';
import { AdminState } from '../worker.mjs';

const origin = 'https://admin.example.test';
const env = {
  ADMIN_USERNAME: 'editor',
  ADMIN_PASSWORD: 'password-for-tests-123',
  DISCORD_CLIENT_ID: '123456789012345678',
  DISCORD_CLIENT_SECRET: 'client-secret-test',
  DISCORD_BOT_TOKEN: 'bot-token-test',
  DISCORD_INVITE_CHANNEL_ID: '234567890123456789',
};
const steam = '76561198000000000',
  discord = '123456789012345678';
const store = () => {
  const records = new Map();
  return {
    records,
    async get(k) {
      return records.get(k);
    },
    async put(k, v) {
      records.set(k, v);
    },
    async delete(k) {
      records.delete(k);
    },
  };
};
function setup() {
  const storage = store(),
    calls = [];
  const fetcher = async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith('/oauth2/token')) return Response.json({ access_token: 'user-token' });
    if (url.endsWith('/users/@me')) return Response.json({ id: discord, username: 'Jugador' });
    if (url.includes('/invites')) return Response.json({ code: 'one-use-invite' });
    throw new Error('URL inesperada');
  };
  const access = createAccessService({
    env,
    store: storage,
    assets: async (path) => new Response(path),
    fetcher,
  });
  const req = (path, options = {}) => access(new Request(origin + path, options));
  return { storage, calls, req };
}
async function login(req) {
  const start = await req('/acceso/login');
  assert.equal(start.status, 302);
  const state = new URL(start.headers.get('location')).searchParams.get('state');
  const oauthCookie = /(__Host-krp_oauth=[a-f0-9]{64})/.exec(start.headers.get('set-cookie'))?.[1];
  const callback = await req('/acceso/callback?code=good&state=' + state, {
    headers: { Cookie: oauthCookie },
  });
  assert.equal(callback.status, 302);
  const sessionCookie = /(__Host-krp_access=[a-f0-9]{64})/.exec(
    callback.headers.get('set-cookie'),
  )?.[1];
  assert.ok(sessionCookie);
  return sessionCookie;
}
const submit = (req, cookie, steamId = steam, headers = {}) =>
  req('/acceso/api/submit', {
    method: 'POST',
    headers: { Cookie: cookie, Origin: origin, 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ steamId, consent: true }),
  });

test('OAuth identifica al usuario y solo después entrega una invitación individual', async () => {
  const { req, calls, storage } = setup();
  assert.equal((await req('/acceso/api/session')).status, 200);
  assert.equal((await submit(req, 'invalid')).status, 401);
  const cookie = await login(req);
  const before = await (await req('/acceso/api/session', { headers: { Cookie: cookie } })).json();
  assert.deepEqual(before.user, { id: discord, name: 'Jugador' });
  assert.equal(before.invite, null);
  const response = await submit(req, cookie);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).invite, 'https://discord.gg/one-use-invite');
  const inviteCall = calls.find((call) => call.url.includes('/invites'));
  assert.deepEqual(JSON.parse(inviteCall.options.body), {
    max_age: 900,
    max_uses: 1,
    unique: true,
    target_user_ids: [discord],
  });
  assert.equal(storage.records.get('access-application:' + discord).steamId, steam);
  assert.equal(storage.records.get('access-application:' + discord).result, 'Invitación emitida');
});
test('El formulario comprueba formato, origen, identidad y duplicados', async () => {
  const { req, storage } = setup();
  const cookie = await login(req);
  assert.equal((await submit(req, cookie, '123')).status, 400);
  assert.equal(
    (
      await req('/acceso/api/submit', {
        method: 'POST',
        headers: { Cookie: cookie, Origin: origin, 'Content-Type': 'application/json' },
        body: JSON.stringify({ steamId: steam, consent: false }),
      })
    ).status,
    400,
  );
  assert.equal((await submit(req, cookie, steam, { Origin: 'https://other.example' })).status, 403);
  assert.equal((await submit(req, cookie)).status, 200);
  assert.equal(storage.records.get('access-index').length, 1);
  assert.equal((await submit(req, cookie, '76561198000000001')).status, 409);
});
test('El panel solo muestra solicitudes autenticadas y permite eliminarlas con CSRF', async () => {
  const { req, storage } = setup();
  const cookie = await login(req);
  await submit(req, cookie);
  const admin = createService({
    env,
    store: storage,
    repo: {},
    assets: async () => new Response('HTML'),
  });
  const adminReq = (path, options = {}) =>
    admin(new Request(origin + '/admin/api/' + path, options));
  assert.equal((await adminReq('solicitudes')).status, 401);
  const auth = await adminReq('login', {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: env.ADMIN_USERNAME, password: env.ADMIN_PASSWORD }),
  });
  const adminCookie = /(__Host-krp_admin=[a-f0-9]{64})/.exec(auth.headers.get('set-cookie'))?.[1],
    csrf = (await auth.json()).csrf;
  const list = await adminReq('solicitudes', { headers: { Cookie: adminCookie } });
  assert.equal((await list.json()).items[0].steamId, steam);
  const deletion = {
    method: 'DELETE',
    headers: {
      Cookie: adminCookie,
      Origin: origin,
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrf,
    },
    body: JSON.stringify({ discordId: discord }),
  };
  assert.equal(
    (
      await adminReq('solicitudes', {
        ...deletion,
        headers: { ...deletion.headers, 'X-CSRF-Token': 'wrong' },
      })
    ).status,
    403,
  );
  assert.equal((await adminReq('solicitudes', deletion)).status, 200);
  assert.equal(storage.records.get('access-application:' + discord), undefined);
  assert.equal(storage.records.get('access-steam:' + steam), undefined);
});
test('La caducidad elimina la solicitud y libera el SteamID', async () => {
  const storage = store();
  storage.list = async () => new Map(storage.records);
  storage.getAlarm = async () => Date.now() + 1000;
  storage.setAlarm = async () => {};
  storage.records.set('access-application:' + discord, {
    discordId: discord,
    steamId: steam,
    expires: Date.now() - 1,
  });
  storage.records.set('access-steam:' + steam, discord);
  storage.records.set('access-index', [discord]);
  const state = { storage, blockConcurrencyWhile: async (callback) => callback() };
  const object = new AdminState(state, { ADMIN_STATE: {}, GITHUB_TOKEN: 'test' });
  await object.alarm();
  assert.equal(storage.records.has('access-application:' + discord), false);
  assert.equal(storage.records.has('access-steam:' + steam), false);
  assert.deepEqual(storage.records.get('access-index'), []);
});
test('El solicitante puede retirar sus datos con su propia sesión', async () => {
  const { req, storage } = setup();
  const cookie = await login(req);
  await submit(req, cookie);
  assert.equal(
    (
      await req('/acceso/api/delete', {
        method: 'POST',
        headers: {
          Cookie: cookie,
          Origin: 'https://other.example',
          'Content-Type': 'application/json',
        },
        body: '{}',
      })
    ).status,
    403,
  );
  const deleted = await req('/acceso/api/delete', {
    method: 'POST',
    headers: { Cookie: cookie, Origin: origin, 'Content-Type': 'application/json' },
    body: '{}',
  });
  assert.equal(deleted.status, 200);
  assert.equal(storage.records.get('access-application:' + discord), undefined);
  assert.equal(storage.records.get('access-steam:' + steam), undefined);
  const state = await (await req('/acceso/api/session', { headers: { Cookie: cookie } })).json();
  assert.equal(state.registered, false);
  assert.equal(state.invite, null);
});
