// Qué formas de entrar al panel están activas. Sin configurar ninguna, el panel responde 503.
const ID = /^[0-9]{17,20}$/;

// ADMIN_DISCORD_IDS: identificadores de Discord del equipo separados por comas o espacios.
export const adminIds = (env) =>
  (env.ADMIN_DISCORD_IDS || '').split(/[,\s]+/).filter((id) => ID.test(id));

// Usuario y contraseña propios; se apagan con ADMIN_PASSWORD_LOGIN=off aunque sigan definidos.
export const passwordEnabled = (env) =>
  Boolean(env.ADMIN_USERNAME?.trim()) &&
  (env.ADMIN_PASSWORD?.length || 0) >= 13 &&
  env.ADMIN_PASSWORD_LOGIN !== 'off';

export const discordEnabled = (env) =>
  adminIds(env).length > 0 && Boolean(env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET);

export const authMethods = (env) => ({
  discord: discordEnabled(env),
  password: passwordEnabled(env),
});
