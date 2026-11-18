// Sesiones del panel: cookie, inicio y cierre de sesión, y límite de intentos.
import { MAX_AGE } from '../config.mjs';
import { json, hashHex, equal, token } from '../http.mjs';
import { adminIds, passwordEnabled } from '../auth.mjs';
import { audit } from '../audit.mjs';

const ATTEMPT_WINDOW = 900000;
const MAX_ATTEMPTS = 5;

export const sessionCookieName = (local) => (local ? 'krp_admin' : '__Host-krp_admin');

const cookieAttributes = (local, maxAge) =>
  `HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${local ? '' : '; Secure'}`;

const passwordVersion = (env) => hashHex(env.ADMIN_USERNAME + '\0' + env.ADMIN_PASSWORD);

// Crea la sesión del panel guardando quién es (para el registro) y devuelve su cookie y su token CSRF.
export async function createAdminSession({ store, env, local, actor, previousCookie }) {
  const id = token();
  const csrf = token();
  await store.put('session:' + hashHex(id), {
    csrf,
    actor,
    credentialsVersion: passwordVersion(env),
    expires: Date.now() + MAX_AGE * 1000,
  });
  if (previousCookie) await store.delete('session:' + hashHex(previousCookie));
  await audit(store, actor, 'inicio-sesion');
  return { csrf, cookie: `${sessionCookieName(local)}=${id}; ${cookieAttributes(local, MAX_AGE)}` };
}

// Busca la sesión de la petición. `valid` solo es verdadero si no ha caducado y su forma de entrar
// sigue activa: la persona sigue en la lista de Discord o la contraseña no ha cambiado.
export async function findSession({ request, env, store, local }) {
  const name = sessionCookieName(local);
  const cookie = request.headers
    .get('cookie')
    ?.split(';')
    .map((v) => v.trim())
    .find((v) => v.startsWith(name + '='))
    ?.slice(name.length + 1);
  const session =
    cookie && /^[a-f0-9]{64}$/.test(cookie) ? await store.get('session:' + hashHex(cookie)) : null;
  const credentialsVersion = passwordVersion(env);
  const stillAllowed =
    session?.actor?.method === 'discord'
      ? adminIds(env).includes(session.actor.id)
      : passwordEnabled(env) && session?.credentialsVersion === credentialsVersion;
  const valid = session && session.expires > Date.now() && stillAllowed;
  return { cookie, session, credentialsVersion, valid: !!valid };
}

export async function login({ request, data, env, store, local, cookie }) {
  const ip = request.headers.get('cf-connecting-ip') || 'local';
  const key = 'attempt:' + hashHex(ip);
  const now = Date.now();
  let attempts = await store.get(key);
  if (!attempts || attempts.expires < now) attempts = { count: 0, expires: now + ATTEMPT_WINDOW };
  if (attempts.count >= MAX_ATTEMPTS)
    return json({ error: 'Demasiados intentos. Espera 15 minutos.' }, 429);
  attempts.count++;
  await store.put(key, attempts);
  if (
    typeof data.username !== 'string' ||
    typeof data.password !== 'string' ||
    data.password.length > 1024 ||
    !equal(data.username, env.ADMIN_USERNAME) ||
    !equal(data.password, env.ADMIN_PASSWORD)
  )
    return json({ error: 'Usuario o contraseña incorrectos.' }, 401);
  await store.delete(key);
  const actor = { id: 'password', name: env.ADMIN_USERNAME, method: 'password' };
  const session = await createAdminSession({ store, env, local, actor, previousCookie: cookie });
  return json({ csrf: session.csrf }, 200, { 'Set-Cookie': session.cookie });
}

export async function logout({ store, local, cookie }) {
  await store.delete('session:' + hashHex(cookie));
  return json({ ok: true }, 200, {
    'Set-Cookie': `${sessionCookieName(local)}=; ${cookieAttributes(local, 0)}`,
  });
}
