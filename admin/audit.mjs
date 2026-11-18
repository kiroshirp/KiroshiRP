// Registro de acciones del equipo en el panel: quién hizo qué y cuándo. Se borra solo a los 180 días.
import { token } from './http.mjs';

const RETENTION = 180 * 86400000;
let sequence = 0; // desempata acciones dentro del mismo milisegundo

// actor: { id, name, method }; target: { id, name, detail? } o null.
export async function audit(store, actor, action, target = null) {
  const at = new Date().toISOString();
  await store.put(
    `audit:${at}:${String(sequence++ % 1000000).padStart(6, '0')}${token().slice(0, 4)}`,
    {
      at,
      actor,
      action,
      target,
      expires: Date.now() + RETENTION,
    },
  );
}

// Las últimas acciones, la más reciente primero.
export async function recentActions(store, limit = 200) {
  const rows = [...(await store.list({ prefix: 'audit:' })).entries()];
  return rows
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .slice(0, limit)
    .map(([, value]) => ({
      at: value.at,
      actor: value.actor,
      action: value.action,
      target: value.target,
    }));
}
