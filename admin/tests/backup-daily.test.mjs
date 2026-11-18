import { test } from 'node:test';
import assert from 'node:assert/strict';
import { snapshot } from '../backup.mjs';

test('La copia diaria guarda los datos una vez al día, sin efímeros ni copias previas, y conserva 7', async () => {
  const m = new Map([['account:1', { n: 1 }], ['access-session:x', {}]]);
  const store = {
    get: async (k) => m.get(k),
    put: async (k, v) => void m.set(k, v),
    delete: async (k) => void m.delete(k),
    list: async ({ prefix }) => new Map([...m].filter(([k]) => k.startsWith(prefix))),
  };
  assert.equal(await snapshot(store, new Date('2026-01-01T10:00:00Z')), true);
  assert.equal(await snapshot(store, new Date('2026-01-01T20:00:00Z')), false);
  assert.deepEqual(Object.keys(m.get('backup:2026-01-01').data), ['account:1']);
  for (let d = 2; d <= 9; d++) await snapshot(store, new Date(`2026-01-0${d}T10:00:00Z`));
  const days = [...m.keys()].filter((k) => k.startsWith('backup:')).sort();
  assert.equal(days.length, 7);
  assert.equal(days[0], 'backup:2026-01-03');
  assert.deepEqual(Object.keys(m.get('backup:2026-01-09').data), ['account:1']);
});
