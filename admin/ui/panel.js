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
  const out = el('button', 'Cerrar sesión');
  out.type = 'button';
  out.addEventListener('click', async () => {
    try {
      await api('logout', 'POST', {});
    } catch {}
    state.csrf = '';
    location.href = '/admin/';
  });
  nav.append(out);
  nav.hidden = false;
}
// Carga la sesión; en 401 se llama a onUnauth (por defecto, redirige al login).
export async function start(init) {
  try {
    state.csrf = (await api('session')).csrf;
  } catch {
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
