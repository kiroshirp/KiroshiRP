import { api, el, fmtDate, state, setOnUnauth, start, mountNav, delButton } from './panel.js';
const $ = (id) => document.getElementById(id);
let items = [];
function showLogin() {
  state.csrf = '';
  $('nav').hidden = true;
  $('app').hidden = true;
  $('login-form').hidden = false;
}
setOnUnauth(showLogin);
function render() {
  const q = $('q').value.trim().toLowerCase();
  const list = items.filter(
    (u) => !q || (u.name || '').toLowerCase().includes(q) || String(u.discordId).includes(q),
  );
  $('count').textContent =
    `${items.length} cuenta${items.length === 1 ? '' : 's'}` +
    (q ? ` · ${list.length} coinciden` : '');
  $('rows').replaceChildren(
    ...list.map((u) => {
      const d = el('td', u.name || '—');
      d.append(el('small', u.discordId));
      const f = el('td');
      if (u.character) {
        const p = Math.max(0, Math.min(100, Math.round(Number(u.character.progress) || 0)));
        const bar = el('progress');
        bar.max = 100;
        bar.value = p;
        bar.setAttribute('aria-label', 'Ficha completada al ' + p + '%');
        f.append(bar, ' ' + p + '%');
      } else f.textContent = '—';
      const t = el('td');
      if (u.team) t.append(el('span', u.team.status, 'badge ' + u.team.status));
      else t.textContent = '—';
      const act = el('td');
      act.append(
        delButton(
          'Eliminar cuenta',
          `¿Eliminar la cuenta de ${u.name || u.discordId}?\n\nSe borrarán TODOS sus datos: ficha, solicitudes y sesiones. Esta acción es irreversible.`,
          async () => {
            try {
              await api('usuarios', 'DELETE', { discordId: u.discordId });
              await load();
            } catch (e) {
              $('status').textContent = e.message;
            }
          },
        ),
      );
      const tr = el('tr');
      tr.append(
        d,
        el('td', fmtDate(u.since)),
        el('td', fmtDate(u.lastLogin)),
        f,
        t,
        el('td', u.access ? u.access.steamId : '—'),
        act,
      );
      return tr;
    }),
  );
}
async function load() {
  try {
    items = (await api('usuarios')).items;
    $('status').textContent = '';
    render();
  } catch (e) {
    $('status').textContent = e.message;
  }
}
async function enter() {
  $('login-form').hidden = true;
  $('app').hidden = false;
  await load();
}
$('q').addEventListener('input', render);
$('login-form').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const err = $('login-error');
  err.hidden = true;
  try {
    state.csrf = (
      await api('login', 'POST', { username: $('u').value.trim(), password: $('p').value })
    ).csrf;
    $('p').value = '';
    mountNav();
    await enter();
  } catch (e) {
    err.textContent = e.message;
    err.hidden = false;
  }
});
start(enter);
