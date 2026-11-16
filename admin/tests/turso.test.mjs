import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tursoStore } from '../turso-store.mjs';
import { AdminState } from '../worker.mjs';

// Turso simulado: entiende solo las consultas que emite el almacén.
function fakeTurso() {
  const rows = new Map();
  const calls = [];
  const cell = (value) => ({ type: 'text', value });
  const fetcher = async (url, options) => {
    calls.push({ url, auth: options.headers.Authorization });
    const { requests } = JSON.parse(options.body);
    const results = requests.map(({ type, stmt }) => {
      if (type === 'close') return { type: 'ok', response: { type: 'close' } };
      const a = (stmt.args || []).map((x) => x.value);
      let out = [];
      if (stmt.sql.startsWith('SELECT value')) out = rows.has(a[0]) ? [[cell(rows.get(a[0]))]] : [];
      else if (stmt.sql.startsWith('INSERT')) rows.set(a[0], a[1]);
      else if (stmt.sql.startsWith('DELETE')) rows.delete(a[0]);
      else if (stmt.sql.startsWith('SELECT key'))
        out = [...rows]
          .filter(([k]) => k.slice(0, Number(a[0])) === a[1])
          .map(([k, v]) => [cell(k), cell(v)]);
      else if (!stmt.sql.startsWith('CREATE')) throw new Error('SQL inesperado: ' + stmt.sql);
      return { type: 'ok', response: { type: 'execute', result: { rows: out } } };
    });
    return Response.json({ results });
  };
  return { rows, calls, fetcher };
}
const make = () => {
  const turso = fakeTurso();
  return {
    ...turso,
    store: tursoStore({
      url: 'libsql://prueba.turso.io/',
      token: 'token-de-prueba',
      fetcher: turso.fetcher,
    }),
  };
};

test('Turso: guardar, leer, borrar y listar por prefijo conservan el valor JSON', async () => {
  const { store, calls } = make();
  await store.put('account:1', { since: 'hoy', n: 2 });
  await store.put('account:2', ['a']);
  await store.put('team-index', ['1']);
  assert.deepEqual(await store.get('account:1'), { since: 'hoy', n: 2 });
  assert.equal(await store.get('no-existe'), undefined);
  assert.deepEqual([...(await store.list({ prefix: 'account:' })).keys()].sort(), [
    'account:1',
    'account:2',
  ]);
  assert.equal((await store.list({ prefix: '' })).size, 3);
  await store.delete('account:1');
  assert.equal(await store.get('account:1'), undefined);
  assert.equal(calls[0].url, 'https://prueba.turso.io/v2/pipeline');
  assert.equal(calls[0].auth, 'Bearer token-de-prueba');
});
test('Turso: el prefijo se compara literalmente, sin comodines', async () => {
  const { store } = make();
  await store.put('a%b', 1);
  await store.put('axb', 2);
  assert.deepEqual([...(await store.list({ prefix: 'a%' })).keys()], ['a%b']);
});
test('Un fallo de Turso se informa y se reintenta la creación de la tabla', async () => {
  let fail = true;
  const store = tursoStore({
    url: 'https://x.turso.io',
    token: 't',
    fetcher: async () =>
      fail
        ? new Response('no', { status: 500 })
        : Response.json({ results: [{ type: 'ok', response: { type: 'close' } }] }),
  });
  await assert.rejects(store.put('k', 1), /Turso respondió 500/);
  fail = false;
  await assert.doesNotReject(store.delete('k'));
});
test('El Worker copia a Turso lo guardado en el Durable Object y luego lo borra', async () => {
  const { rows, fetcher } = make();
  const original = globalThis.fetch;
  globalThis.fetch = fetcher;
  try {
    const old = new Map([
      ['account:1', { since: 'ayer' }],
      ['team-index', ['1']],
    ]);
    const storage = {
      async get(k) {
        return old.get(k);
      },
      async put(k, v) {
        old.set(k, v);
      },
      async list() {
        return new Map(old);
      },
      async deleteAll() {
        old.clear();
      },
      async getAlarm() {
        return 1;
      },
      async setAlarm() {},
    };
    const state = { storage, blockConcurrencyWhile: async (f) => f() };
    const object = new AdminState(state, {
      ADMIN_STATE: {},
      TURSO_DATABASE_URL: 'libsql://prueba.turso.io',
      TURSO_AUTH_TOKEN: 'token',
      ASSETS: { fetch: async () => new Response('ok') },
    });
    const response = await object.fetch(new Request('https://x.test/cuenta/'));
    assert.equal(response.status, 200);
    assert.deepEqual(JSON.parse(rows.get('account:1')), { since: 'ayer' });
    assert.deepEqual([...old.keys()], ['moved-to-turso']);
    await object.fetch(new Request('https://x.test/cuenta/'));
    assert.equal(rows.size, 2);
  } finally {
    globalThis.fetch = original;
  }
});
test('Si Turso no responde, el Worker contesta 503 sin filtrar detalles', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response('secreto interno', { status: 500 });
  const log = console.error;
  console.error = () => {};
  try {
    const storage = {
      async get() {},
      async put() {},
      async list() {
        return new Map();
      },
      async deleteAll() {},
      async getAlarm() {
        return 1;
      },
      async setAlarm() {},
    };
    const object = new AdminState(
      { storage, blockConcurrencyWhile: async (f) => f() },
      { TURSO_DATABASE_URL: 'libsql://x.turso.io', TURSO_AUTH_TOKEN: 't', ASSETS: {} },
    );
    const response = await object.fetch(new Request('https://x.test/cuenta/'));
    assert.equal(response.status, 503);
    assert.ok(!(await response.text()).includes('secreto interno'));
  } finally {
    globalThis.fetch = original;
    console.error = log;
  }
});
