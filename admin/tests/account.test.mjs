import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAccessService } from '../access.mjs';
import { teamSections } from '../team-form.mjs';

const origin = 'https://admin.example.test';
const discord = '123456789012345678';
const env = {
  DISCORD_CLIENT_ID: '123456789012345678',
  DISCORD_CLIENT_SECRET: 'client-secret-test',
  DISCORD_BOT_TOKEN: 'bot-token-test',
  DISCORD_INVITE_CHANNEL_ID: '234567890123456789',
};
function setup() {
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
  };
  const fetcher = async (url) => {
    if (url.endsWith('/oauth2/token')) return Response.json({ access_token: 'user-token' });
    if (url.endsWith('/users/@me')) return Response.json({ id: discord, username: 'Jugador' });
    throw new Error('URL inesperada');
  };
  const access = createAccessService({ env, store, assets: async (p) => new Response(p), fetcher });
  return { records, req: (path, options = {}) => access(new Request(origin + path, options)) };
}
async function login(req) {
  const start = await req('/acceso/login?next=cuenta');
  const state = new URL(start.headers.get('location')).searchParams.get('state');
  const oauth = /(__Host-krp_oauth=[a-f0-9]{64})/.exec(start.headers.get('set-cookie'))[1];
  const callback = await req('/acceso/callback?code=good&state=' + state, {
    headers: { Cookie: oauth },
  });
  return {
    callback,
    cookie: /(__Host-krp_access=[a-f0-9]{64})/.exec(callback.headers.get('set-cookie'))[1],
  };
}
const answers = Object.fromEntries(
  teamSections
    .flatMap((s) => s.fields)
    .map((f) => [
      f.id,
      f.type === 'select' ? 'Sí' : f.type === 'number' ? '25' : 'Respuesta de prueba',
    ]),
);
const post = (req, cookie, path, body, headers = {}) =>
  req(path, {
    method: 'POST',
    headers: { Cookie: cookie, Origin: origin, 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
const send = (req, cookie, body = { answers, consent: true }, headers) =>
  post(req, cookie, '/cuenta/api/team', body, headers);

test('El inicio de sesión desde Mi cuenta vuelve a /cuenta/ con sesión de 8 horas', async () => {
  const { req } = setup();
  const { callback } = await login(req);
  assert.equal(callback.headers.get('location'), '/cuenta/');
  assert.match(callback.headers.get('set-cookie'), /krp_access=[a-f0-9]{64}; .*Max-Age=28800/);
  assert.equal((await req('/cuenta')).status, 200);
});
test('Sin sesión no se puede enviar y la sesión informa de que no hay usuario', async () => {
  const { req } = setup();
  assert.deepEqual(await (await req('/cuenta/api/session')).json(), { user: null });
  assert.equal((await send(req, 'invalid')).status, 401);
});
test('La solicitud valida origen, campos obligatorios, opciones y consentimiento', async () => {
  const { req } = setup();
  const { cookie } = await login(req);
  assert.equal(
    (await send(req, cookie, undefined, { Origin: 'https://otro.example' })).status,
    403,
  );
  assert.equal((await send(req, cookie, { answers, consent: false })).status, 400);
  assert.equal(
    (await send(req, cookie, { answers: { ...answers, nombre: '' }, consent: true })).status,
    400,
  );
  assert.equal(
    (await send(req, cookie, { answers: { ...answers, tickets: 'Quizá' }, consent: true })).status,
    400,
  );
  assert.equal(
    (await send(req, cookie, { answers: { ...answers, edad: '-3' }, consent: true })).status,
    400,
  );
  assert.equal(
    (await send(req, cookie, { answers: { ...answers, motivo: 'x'.repeat(1501) }, consent: true }))
      .status,
    400,
  );
});
test('Una cuenta envía una solicitud, la consulta y puede retirarla', async () => {
  const { req, records } = setup();
  const { cookie } = await login(req);
  assert.equal((await send(req, cookie)).status, 200);
  assert.equal(records.get('team-application:' + discord).answers.nombre, 'Respuesta de prueba');
  assert.deepEqual(records.get('team-index'), [discord]);
  assert.equal((await send(req, cookie)).status, 409);
  const session = await (await req('/cuenta/api/session', { headers: { Cookie: cookie } })).json();
  assert.ok(session.team.createdAt);
  assert.equal((await post(req, cookie, '/cuenta/api/team-delete', {})).status, 200);
  assert.equal(records.has('team-application:' + discord), false);
  assert.deepEqual(records.get('team-index'), []);
});
test('Cerrar sesión invalida la cookie', async () => {
  const { req } = setup();
  const { cookie } = await login(req);
  assert.equal((await post(req, cookie, '/cuenta/api/logout', {})).status, 200);
  assert.equal((await send(req, cookie)).status, 401);
});

const sheet = (req, cookie, body) => post(req, cookie, '/cuenta/api/character', body);
const getJson = async (req, cookie, path) =>
  (await req(path, { headers: { Cookie: cookie } })).json();

test('La ficha de personaje es privada, se valida y se puede borrar', async () => {
  const { req, records } = setup();
  assert.equal((await req('/cuenta/api/character')).status, 401);
  const { cookie } = await login(req);
  const empty = await getJson(req, cookie, '/cuenta/api/character');
  assert.equal(empty.sheet, null);
  assert.ok(empty.sections.length > 0);
  assert.equal(
    (await sheet(req, cookie, { values: { alias: 'Ghost' }, images: ['http://x.test/a.png'] }))
      .status,
    400,
  );
  assert.equal((await sheet(req, cookie, { values: { historia: 'x'.repeat(8001) } })).status, 400);
  assert.equal(
    (await sheet(req, cookie, { values: {}, images: Array(13).fill('https://x.test/a.png') }))
      .status,
    400,
  );
  const ok = await sheet(req, cookie, {
    values: { alias: ' Ghost ', desconocido: 'no se guarda' },
    images: ['https://x.test/a.png'],
  });
  assert.equal(ok.status, 200);
  const saved = records.get('character-sheet:' + discord);
  assert.deepEqual(saved.values, { alias: 'Ghost' });
  assert.deepEqual(saved.images, ['https://x.test/a.png']);
  const session = await getJson(req, cookie, '/cuenta/api/session');
  assert.ok(session.character.progress > 0);
  assert.equal((await post(req, cookie, '/cuenta/api/character-delete', {})).status, 200);
  assert.equal(records.has('character-sheet:' + discord), false);
});
test('Mi cuenta muestra desde cuándo existe, cuenta otras sesiones y las cierra', async () => {
  const { req } = setup();
  const first = await login(req);
  const second = await login(req);
  const info = await getJson(req, second.cookie, '/cuenta/api/session');
  assert.ok(info.since);
  assert.ok(info.expiresAt > Date.now());
  assert.equal(info.others, 1);
  const closed = await (
    await post(req, second.cookie, '/cuenta/api/sessions-close-others', {})
  ).json();
  assert.equal(closed.closed, 1);
  assert.equal((await getJson(req, first.cookie, '/cuenta/api/session')).user, null);
  assert.equal((await getJson(req, second.cookie, '/cuenta/api/session')).others, 0);
});
test('Eliminar mis datos borra ficha, solicitud, registro y sesiones', async () => {
  const { req, records } = setup();
  const { cookie } = await login(req);
  await send(req, cookie);
  await sheet(req, cookie, { values: { alias: 'Ghost' } });
  assert.equal((await post(req, cookie, '/cuenta/api/account-delete', {})).status, 200);
  for (const key of ['team-application:', 'character-sheet:', 'account:', 'account-sessions:'])
    assert.equal(records.has(key + discord), false, key);
  assert.deepEqual(records.get('team-index'), []);
  assert.equal((await getJson(req, cookie, '/cuenta/api/session')).user, null);
});
test('Los módulos de sección solo se sirven con nombre seguro', async () => {
  const { req } = setup();
  assert.equal(await (await req('/cuenta/section-economia.js')).text(), '/section-economia.js');
  assert.equal((await req('/cuenta/section-../x.js')).status, 404);
});
