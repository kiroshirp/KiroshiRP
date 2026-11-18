import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
try {
  process.loadEnvFile(path.join(root, '.env'));
} catch (e) {
  if (e.code !== 'ENOENT') throw e;
}
const required = [
  'CLOUDFLARE_ACCOUNT_ID',
  'CLOUDFLARE_API_TOKEN',
  'DISCORD_CLIENT_ID',
  'DISCORD_CLIENT_SECRET',
  'DISCORD_BOT_TOKEN',
  'DISCORD_INVITE_CHANNEL_ID',
  'TURSO_DATABASE_URL',
  'TURSO_AUTH_TOKEN',
];
const missing = required.filter((key) => !process.env[key]?.trim());
// Formas de entrar al panel: usuario y contraseña (apagable con ADMIN_PASSWORD_LOGIN=off) y/o Discord.
const password = process.env.ADMIN_PASSWORD || '';
const discordIds = (process.env.ADMIN_DISCORD_IDS || '')
  .split(/[,\s]+/)
  .filter((id) => /^[0-9]{17,20}$/.test(id));
const passwordLogin =
  Boolean(process.env.ADMIN_USERNAME?.trim()) &&
  password.length >= 13 &&
  process.env.ADMIN_PASSWORD_LOGIN !== 'off';
if (missing.length) {
  console.error('Completa estos campos del .env privado: ' + missing.join(', '));
  process.exitCode = 1;
} else if (password && password.length < 13) {
  console.error('ADMIN_PASSWORD necesita al menos 13 caracteres.');
  process.exitCode = 1;
} else if (!passwordLogin && !discordIds.length) {
  console.error(
    'Define una forma de entrar al panel: ADMIN_DISCORD_IDS (IDs de Discord del equipo) o ADMIN_USERNAME y ADMIN_PASSWORD.',
  );
  process.exitCode = 1;
} else {
  const cli = path.join(root, 'node_modules/wrangler/bin/wrangler.js');
  async function run(args, input) {
    return new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [cli, ...args], {
        cwd: root,
        env: process.env,
        stdio: [input ? 'pipe' : 'ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });
      let output = '';
      child.stdout.on('data', (v) => {
        output += v;
      });
      child.stderr.on('data', (v) => {
        output += v;
      });
      child.on('error', reject);
      child.on('close', (code) => {
        if (code !== 0)
          reject(
            new Error(
              'Cloudflare no completó la operación. Revisa la cuenta y los permisos del token.',
            ),
          );
        else resolve(output);
      });
      if (input) child.stdin.end(input);
    });
  }
  try {
    console.log('Publicando el servicio privado…');
    const output = await run(['deploy']);
    // Los marcadores 'off' y 'none' apagan lo que ya no está en el .env (los secretos antiguos no se borran).
    const secrets = Object.fromEntries(
      [
        'DISCORD_CLIENT_ID',
        'DISCORD_CLIENT_SECRET',
        'DISCORD_BOT_TOKEN',
        'DISCORD_INVITE_CHANNEL_ID',
        'TURSO_DATABASE_URL',
        'TURSO_AUTH_TOKEN',
      ].map((k) => [k, process.env[k]]),
    );
    if (process.env.ADMIN_USERNAME?.trim() && password) {
      secrets.ADMIN_USERNAME = process.env.ADMIN_USERNAME;
      secrets.ADMIN_PASSWORD = password;
    }
    secrets.ADMIN_PASSWORD_LOGIN = passwordLogin ? 'on' : 'off';
    secrets.ADMIN_DISCORD_IDS = discordIds.length ? discordIds.join(',') : 'none';
    await run(['secret', 'bulk'], JSON.stringify(secrets));
    console.log(
      'Acceso al panel: ' +
        [
          passwordLogin && 'usuario y contraseña',
          discordIds.length && 'Discord (' + discordIds.length + ' ID)',
        ]
          .filter(Boolean)
          .join(' y '),
    );
    const address = output.match(/https:\/\/[a-z0-9.-]+\.workers\.dev/gi)?.at(-1);
    console.log(
      'Administrador desplegado. ' +
        (address
          ? 'Dirección: ' + address + '/admin/'
          : 'Consulta su dirección en Cloudflare Workers.'),
    );
    console.log(
      'Configura site.adminUrl en src/data/portal.json con esa dirección verificada y publica el portal.',
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
