// Copia diaria de los datos dentro de la propia base (claves backup:<fecha>), con las 7 últimas.
// shortcut: protege de borrados y errores de la aplicación, no de perder la base entera; para eso está `npm run admin:backup` (copia local) o activar R2.
const EPHEMERAL = ['access-session:', 'access-state:', 'access-limit:', 'backup:'];
export const exportable = (entries) =>
  Object.fromEntries(
    [...entries].filter(([key]) => !EPHEMERAL.some((prefix) => key.startsWith(prefix))),
  );
const KEEP = 7;

export async function snapshot(store, now = new Date()) {
  const key = 'backup:' + now.toISOString().slice(0, 10);
  if (await store.get(key)) return false;
  await store.put(key, { at: now.toISOString(), data: exportable(await store.list({ prefix: '' })) });
  const old = [...(await store.list({ prefix: 'backup:' })).keys()].sort().slice(0, -KEEP);
  for (const k of old) await store.delete(k);
  return true;
}
