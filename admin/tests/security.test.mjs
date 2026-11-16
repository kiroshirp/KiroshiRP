import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createService } from '../service.mjs';

const discord = '123456789012345678';
function setup(local = true) {
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
  const env = { ADMIN_USERNAME: 'test-editor', ADMIN_PASSWORD: 'test-only-password-very-long' };
  const service = createService({
    env,
    store,
    assets: async (path) => new Response(path),
    local,
  });
  let cookie = '',
    csrf = '';
  const origin = local ? 'http://127.0.0.1:4310' : 'https://admin.example.test';
  const req = async (endpoint, method = 'GET', body, headers = {}) => {
    const r = await service(
      new Request(origin + '/admin/api/' + endpoint, {
        method,
        headers: {
          Origin: origin,
          ...(cookie ? { Cookie: cookie } : {}),
          ...(method !== 'GET' ? { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf } : {}),
          ...headers,
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      }),
    );
    return { status: r.status, headers: r.headers, body: await r.json() };
  };
  const login = async () => {
    const result = await req('login', 'POST', {
      username: env.ADMIN_USERNAME,
      password: env.ADMIN_PASSWORD,
    });
    assert.equal(result.status, 200);
    cookie = result.headers.get('set-cookie').split(';')[0];
    csrf = result.body.csrf;
    return result;
  };
  return { records, req, login, env, origin };
}
test('La API niega el acceso anónimo', async () => {
  const s = setup();
  for (const endpoint of ['session', 'usuarios', 'equipo', 'solicitudes'])
    assert.equal((await s.req(endpoint)).status, 401);
});
test('Solo se sirven los recursos públicos previstos del panel', async () => {
  const service = createService({
    env: {},
    store: {},
    assets: async (path) => new Response(path),
    local: true,
  });
  for (const [route, asset] of [
    ['brand.webp', '/brand.webp'],
    ['favicon.png', '/favicon.png'],
    ['equipo', '/equipo.html'],
    ['fonts.css', '/fonts.css'],
    ['fonts/inter-latin-400-normal.woff2', '/fonts/inter-latin-400-normal.woff2'],
  ]) {
    const response = await service(new Request('http://127.0.0.1:4310/admin/' + route));
    assert.equal(response.status, 200);
    assert.equal(await response.text(), asset);
  }
  for (const route of ['private.txt', 'editor.js'])
    assert.equal((await service(new Request('http://127.0.0.1:4310/admin/' + route))).status, 404);
});
test('Inicio de sesión: error genérico, límite de intentos y contraseña mínima', async () => {
  const s = setup();
  for (let i = 0; i < 5; i++)
    assert.equal(
      (await s.req('login', 'POST', { username: 'otro', password: 'mala' })).status,
      401,
    );
  assert.equal(
    (
      await s.req('login', 'POST', {
        username: s.env.ADMIN_USERNAME,
        password: s.env.ADMIN_PASSWORD,
      })
    ).status,
    429,
  );
  s.env.ADMIN_PASSWORD = 'corta';
  assert.equal((await s.req('session')).status, 503);
});
test('Cookies de producción privadas y sin almacenamiento del token en la respuesta', async () => {
  const s = setup(false);
  const r = await s.login();
  assert.match(
    r.headers.get('set-cookie'),
    /__Host-krp_admin=.*HttpOnly; SameSite=Strict; Path=\/; Max-Age=7200; Secure/,
  );
  assert.ok(!('password' in r.body));
  assert.equal(r.headers.get('cache-control'), 'no-store');
  assert.match(r.headers.get('content-security-policy'), /frame-ancestors 'none'/);
});
test('Cambio de credenciales, caducidad y cierre de sesión invalidan la sesión', async () => {
  const s = setup();
  await s.login();
  s.env.ADMIN_PASSWORD += 'nuevo';
  assert.equal((await s.req('usuarios')).status, 401);
  await s.login();
  for (const value of s.records.values()) if (value.csrf) value.expires = 0;
  assert.equal((await s.req('usuarios')).status, 401);
  await s.login();
  assert.equal((await s.req('logout', 'POST', {})).status, 200);
  assert.equal((await s.req('usuarios')).status, 401);
});
test('Admite la longitud de trece caracteres autorizada sin omitir la autenticación', async () => {
  const s = setup();
  s.env.ADMIN_PASSWORD = 'prueba-13-xxx';
  await s.login();
  assert.equal((await s.req('usuarios')).status, 200);
});
test('Las escrituras requieren origen propio y token CSRF', async () => {
  const s = setup();
  await s.login();
  for (const headers of [{ Origin: 'https://evil.example' }, { 'X-CSRF-Token': 'incorrecto' }])
    assert.equal((await s.req('usuarios', 'DELETE', { discordId: discord }, headers)).status, 403);
});
test('Usuarios: lista cuentas sin exponer la ficha y las borra por completo', async () => {
  const s = setup();
  const now = new Date().toISOString();
  s.records.set('account:' + discord, { since: now, name: 'Jugador', lastLogin: now });
  s.records.set('account-sessions:' + discord, ['abc']);
  s.records.set('access-session:abc', { discordId: discord, expires: Date.now() + 1000 });
  s.records.set('character-sheet:' + discord, {
    values: { alias: 'Ghost', secretos: 'MUY PRIVADO' },
    images: [],
    updatedAt: now,
  });
  s.records.set('team-application:' + discord, { createdAt: now, answers: {} });
  s.records.set('team-index', [discord]);
  s.records.set('access-application:' + discord, { steamId: '76561198000000000', createdAt: now });
  s.records.set('access-steam:76561198000000000', discord);
  s.records.set('access-index', [discord]);
  await s.login();
  const list = await s.req('usuarios');
  assert.equal(list.status, 200);
  const [user] = list.body.items;
  assert.equal(user.name, 'Jugador');
  assert.ok(user.character.progress > 0);
  assert.equal(user.team.status, 'pendiente');
  assert.equal(user.access.steamId, '76561198000000000');
  assert.ok(!JSON.stringify(list.body).includes('MUY PRIVADO'));
  assert.equal((await s.req('usuarios', 'DELETE', { discordId: 'no-valido' })).status, 400);
  assert.equal((await s.req('usuarios', 'DELETE', { discordId: discord })).status, 200);
  for (const key of [
    'account:',
    'account-sessions:',
    'character-sheet:',
    'team-application:',
    'access-application:',
  ])
    assert.equal(s.records.has(key + discord), false, key);
  assert.equal(s.records.has('access-session:abc'), false);
  assert.equal(s.records.has('access-steam:76561198000000000'), false);
  assert.deepEqual(s.records.get('team-index'), []);
  assert.deepEqual(s.records.get('access-index'), []);
});
test('Equipo: el administrador cambia el estado y valida los valores', async () => {
  const s = setup();
  s.records.set('team-application:' + discord, {
    discordName: 'Jugador',
    createdAt: new Date().toISOString(),
    answers: { nombre: 'Ana' },
  });
  s.records.set('team-index', [discord]);
  await s.login();
  const before = (await s.req('equipo')).body;
  assert.equal(before.items[0].status, 'pendiente');
  assert.ok(before.labels.nombre);
  assert.equal((await s.req('equipo', 'PUT', { discordId: discord, status: 'quizá' })).status, 400);
  assert.equal(
    (await s.req('equipo', 'PUT', { discordId: discord, status: 'aceptada' })).status,
    200,
  );
  assert.equal((await s.req('equipo')).body.items[0].status, 'aceptada');
  assert.equal((await s.req('equipo', 'DELETE', { discordId: discord })).status, 200);
  assert.equal((await s.req('equipo')).body.items.length, 0);
});
test('Usuarios: el detalle muestra lo que rellenó la persona, salvo los campos privados', async () => {
  const s = setup();
  const now = new Date().toISOString();
  s.records.set('character-sheet:' + discord, {
    values: { alias: 'Ghost', historia: 'Nació en Heywood.', secretos: 'MUY PRIVADO' },
    images: ['https://x.test/a.png'],
    updatedAt: now,
  });
  s.records.set('team-application:' + discord, {
    createdAt: now,
    status: 'aceptada',
    answers: { nombre: 'Ana' },
  });
  assert.equal((await s.req('usuarios?id=' + discord)).status, 401);
  await s.login();
  assert.equal((await s.req('usuarios?id=no-valido')).status, 400);
  const { status, body } = await s.req('usuarios?id=' + discord);
  assert.equal(status, 200);
  assert.deepEqual(body.ficha.values, { alias: 'Ghost', historia: 'Nació en Heywood.' });
  assert.deepEqual(body.ficha.images, ['https://x.test/a.png']);
  assert.deepEqual(body.team.answers, { nombre: 'Ana' });
  assert.equal(body.team.status, 'aceptada');
  assert.ok(!JSON.stringify(body).includes('MUY PRIVADO'));
  assert.ok(!body.sections.ficha.some((sec) => sec.fields.some((f) => f.id === 'secretos')));
  assert.equal((await s.req('usuarios?id=222222222222222222')).body.ficha, null);
});
