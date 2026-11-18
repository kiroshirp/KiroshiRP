// Copia de seguridad de los datos de Turso a un archivo local (y restauración).
//   npm run admin:backup                       -> backups/kiroshirp-<fecha>.json
//   node scripts/backup-turso.mjs --restore <archivo>   -> vuelve a escribir esas claves en Turso
// El archivo contiene datos personales: no lo subas a Git (la carpeta backups/ está ignorada) ni lo compartas.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tursoStore } from '../admin/turso-store.mjs';

import { exportable } from '../admin/backup.mjs';
export { exportable };

async function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  try {
    process.loadEnvFile(path.join(root, '.env'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const { TURSO_DATABASE_URL: url, TURSO_AUTH_TOKEN: token } = process.env;
  if (!url?.trim() || !token?.trim()) {
    console.error('Completa TURSO_DATABASE_URL y TURSO_AUTH_TOKEN en el .env privado.');
    process.exitCode = 1;
    return;
  }
  const store = tursoStore({ url, token });
  const restore = process.argv.indexOf('--restore');
  const counts = (data) =>
    Object.entries(
      Object.keys(data).reduce((all, key) => {
        const type = key.split(':')[0];
        all[type] = (all[type] || 0) + 1;
        return all;
      }, {}),
    )
      .map(([type, n]) => `${type}: ${n}`)
      .join(', ') || 'sin datos';
  const snap = process.argv.indexOf('--snapshot');
  if (snap > -1) {
    // Restaura la copia diaria que guarda el propio servicio: --snapshot <AAAA-MM-DD> (sin fecha, lista las disponibles)
    const day = process.argv[snap + 1];
    const all = await store.list({ prefix: 'backup:' });
    if (!day) return console.log('Copias diarias: ' + ([...all.keys()].map((k) => k.slice(7)).sort().join(', ') || 'ninguna'));
    const copy = all.get('backup:' + day);
    if (!copy) throw new Error('No hay copia de ese día.');
    await store.putMany(Object.entries(copy.data));
    return console.log(`Restauradas ${Object.keys(copy.data).length} claves de ${day} (${counts(copy.data)}).`);
  }
  if (restore > -1) {
    const file = process.argv[restore + 1];
    if (!file) throw new Error('Indica el archivo: --restore <archivo>');
    const data = exportable(Object.entries(JSON.parse(fs.readFileSync(file, 'utf8'))));
    await store.putMany(Object.entries(data));
    console.log(`Restauradas ${Object.keys(data).length} claves (${counts(data)}).`);
    return;
  }
  const data = exportable(await store.list({ prefix: '' }));
  const folder = path.join(root, 'backups');
  fs.mkdirSync(folder, { recursive: true });
  const file = path.join(
    folder,
    `kiroshirp-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
  );
  fs.writeFileSync(file, JSON.stringify(data), { mode: 0o600 });
  console.log(
    `Copia guardada en ${path.relative(root, file)} (${Object.keys(data).length} claves: ${counts(data)}).`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch((error) => {
    console.error(error.message.replace(process.env.TURSO_AUTH_TOKEN || '\0', '***'));
    process.exitCode = 1;
  });
