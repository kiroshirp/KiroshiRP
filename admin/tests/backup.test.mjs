import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exportable } from '../../scripts/backup-turso.mjs';

test('La copia conserva cuentas y solicitudes y descarta sesiones, estados y contadores', () => {
  const data = exportable(
    new Map([
      ['account:1', { since: 'hoy' }],
      ['team-application:1', { answers: {} }],
      ['access-session:abc', { discordId: '1' }],
      ['access-state:def', { expires: 1 }],
      ['access-limit:ghi', { count: 2 }],
    ]),
  );
  assert.deepEqual(Object.keys(data).sort(), ['account:1', 'team-application:1']);
});
