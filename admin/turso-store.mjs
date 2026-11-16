// Almacén clave/valor sobre Turso (libSQL) por HTTP, con la misma interfaz que el almacén de Durable Objects.
// shortcut: una sola tabla clave/JSON y listados con barrido completo; basta con pocos miles de filas, pasar a tablas propias si crece.
const text = (value) => ({ type: 'text', value });

export function tursoStore({ url, token, fetcher = fetch }) {
  const endpoint = url.replace(/^libsql:/, 'https:').replace(/\/$/, '') + '/v2/pipeline';
  const run = async (statements) => {
    const response = await fetcher(endpoint, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [...statements.map((stmt) => ({ type: 'execute', stmt })), { type: 'close' }],
      }),
    });
    if (!response.ok) throw new Error('Turso respondió ' + response.status);
    const { results } = await response.json();
    const failed = results.find((r) => r.type === 'error');
    if (failed) throw new Error('Turso: ' + failed.error.message);
    return results.slice(0, -1).map((r) => r.response.result.rows);
  };
  let ready;
  const table = () =>
    (ready ||= run([
      { sql: 'CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL)' },
    ]).catch((error) => {
      ready = null;
      throw error;
    }));
  const exec = async (statements) => {
    await table();
    return run(statements);
  };
  const upsert = (key, value) => ({
    sql: 'INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    args: [text(key), text(JSON.stringify(value))],
  });
  return {
    async get(key) {
      const [rows] = await exec([{ sql: 'SELECT value FROM kv WHERE key = ?', args: [text(key)] }]);
      return rows[0] ? JSON.parse(rows[0][0].value) : undefined;
    },
    async put(key, value) {
      await exec([upsert(key, value)]);
    },
    async delete(key) {
      await exec([{ sql: 'DELETE FROM kv WHERE key = ?', args: [text(key)] }]);
    },
    async list({ prefix = '' } = {}) {
      const [rows] = await exec([
        {
          sql: 'SELECT key, value FROM kv WHERE substr(key, 1, ?) = ?',
          args: [{ type: 'integer', value: String(prefix.length) }, text(prefix)],
        },
      ]);
      return new Map(rows.map(([key, value]) => [key.value, JSON.parse(value.value)]));
    },
    // Copia por lotes (migración inicial).
    async putMany(entries) {
      const all = [...entries].map(([key, value]) => upsert(key, value));
      for (let i = 0; i < all.length; i += 50) await exec(all.slice(i, i + 50));
    },
  };
}
