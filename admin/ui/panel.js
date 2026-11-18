export const state = { csrf: '' };
let onUnauth = () => {
  location.href = '/admin/';
};
export const setOnUnauth = (f) => (onUnauth = f);
export async function api(path, method = 'GET', body) {
  let r;
  try {
    r = await fetch('/admin/api/' + path, {
      method,
      credentials: 'same-origin',
      headers:
        method === 'GET' ? {} : { 'Content-Type': 'application/json', 'X-CSRF-Token': state.csrf },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new Error('Sin conexión con el servicio.');
  }
  let data;
  try {
    data = await r.json();
  } catch {
    throw new Error('El servicio no respondió correctamente.');
  }
  if (!r.ok) {
    if (r.status === 401 && path !== 'login') onUnauth();
    throw Object.assign(new Error(data.error || 'Error del servicio.'), { status: r.status });
  }
  return data;
}
export function el(tag, text, cls) {
  const e = document.createElement(tag);
  if (text != null) e.textContent = text;
  if (cls) e.className = cls;
  return e;
}
export const fmtDate = (v) =>
  v
    ? new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(v),
      )
    : '—';
const links = [
  ['/admin/', 'Usuarios'],
  ['/admin/solicitudes/', 'Solicitudes de acceso'],
  ['/admin/equipo/', 'Equipo'],
  ['/admin/registro/', 'Registro'],
];
export function mountNav() {
  const nav = document.getElementById('nav');
  nav.replaceChildren();
  for (const [href, label] of links) {
    const a = el('a', label);
    a.href = href;
    if (location.pathname.replace(/\/?$/, '/') === href) a.setAttribute('aria-current', 'page');
    nav.append(a);
  }
  // Quién ha entrado: si la sesión aún no se conoce, se pide y se rellena al llegar.
  const who = el('span');
  who.hidden = true;
  Object.assign(who.style, {
    display: 'inline-block',
    maxWidth: '16rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    alignSelf: 'center',
  });
  const showWho = (actor) => {
    if (!actor?.name) return;
    who.textContent = 'Sesión de ' + actor.name;
    who.title = actor.name;
    who.hidden = false;
  };
  showWho(state.actor);
  if (state.actor === undefined)
    api('session')
      .then((s) => {
        state.actor = s.actor ?? null;
        showWho(state.actor);
      })
      .catch(() => {});
  const out = el('button', 'Cerrar sesión');
  out.type = 'button';
  out.addEventListener('click', async () => {
    try {
      await api('logout', 'POST', {});
    } catch {}
    state.csrf = '';
    state.actor = undefined;
    location.href = '/admin/';
  });
  const back = el('a', '← Volver a la web', 'back');
  back.href = 'https://kiroshirp.pages.dev/';
  nav.append(who, out, back);
  nav.hidden = false;
}
// Pantalla de acceso: qué formas de entrar están activas y el aviso de cuenta no autorizada.
export async function setupLogin() {
  const $ = (id) => document.getElementById(id);
  const err = $('login-error');
  const params = new URLSearchParams(location.search);
  if (params.get('error') === 'denegado') {
    err.textContent = 'Tu cuenta de Discord no está autorizada para entrar en este panel.';
    err.hidden = false;
    params.delete('error');
    const q = params.toString();
    history.replaceState(null, '', location.pathname + (q ? '?' + q : '') + location.hash);
  }
  try {
    const { discord, password } = await api('auth');
    $('discord-login').hidden = !discord;
    $('auth-sep').hidden = !(discord && password);
    $('auth-off').hidden = discord || password;
    for (const id of ['f-user', 'f-pass', 'login-submit']) $(id).hidden = !password;
  } catch (e) {
    err.textContent = e.message;
    err.hidden = false;
  }
}
// Carga la sesión; en 401 se llama a onUnauth (por defecto, redirige al login).
export async function start(init) {
  try {
    const s = await api('session');
    state.csrf = s.csrf;
    state.actor = s.actor ?? null;
  } catch {
    if (document.getElementById('login-form')) await setupLogin();
    return false;
  }
  mountNav();
  await init();
  return true;
}
export function delButton(label, message, action) {
  const b = el('button', label, 'danger');
  b.type = 'button';
  b.addEventListener('click', async () => {
    if (confirm(message)) await action();
  });
  return b;
}
