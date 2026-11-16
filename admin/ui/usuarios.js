import { api, el, fmtDate, state, setOnUnauth, start, mountNav, delButton } from './panel.js';
const $ = (id) => document.getElementById(id);
let items = [];
const cache = new Map();
const COLS = 7;
function showLogin() {
  state.csrf = '';
  $('nav').hidden = true;
  $('app').hidden = true;
  $('login-form').hidden = false;
}
setOnUnauth(showLogin);
// Secciones en orden; solo campos con valor.
function block(sections, values) {
  const out = [];
  for (const s of sections || []) {
    const dl = el('dl');
    for (const f of s.fields) {
      const v = values && values[f.id];
      if (v == null || String(v).trim() === '') continue;
      dl.append(el('dt', f.label), el('dd', String(v)));
    }
    if (dl.children.length) out.push(el('h3', s.title), dl);
  }
  return out;
}
function detail(d) {
  const wrap = el('div', null, 'det-grid');
  const fc = el('section', null, 'card');
  fc.append(el('h2', 'Ficha de personaje'));
  if (d.ficha) {
    fc.append(el('p', 'Actualizada: ' + fmtDate(d.ficha.updatedAt), 'meta'));
    const body = block(d.sections.ficha, d.ficha.values);
    fc.append(...body);
    if (!body.length) fc.append(el('p', 'Sin campos rellenados.', 'meta'));
    const imgs = d.ficha.images || [];
    if (imgs.length) {
      fc.append(el('h3', 'Imágenes'));
      const ul = el('ul');
      for (const src of imgs) {
        const a = el('a', src);
        a.href = src;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        const li = el('li');
        li.append(a);
        ul.append(li);
      }
      fc.append(ul);
    }
  } else fc.append(el('p', 'Sin ficha', 'meta'));
  fc.append(el('p', 'El apartado Secretos no se muestra: solo lo ve su autor.', 'note'));
  const tc = el('section', null, 'card');
  tc.append(el('h2', 'Solicitud al equipo'));
  if (d.team) {
    const m = el('p', null, 'meta');
    m.append(el('span', d.team.status, 'badge ' + d.team.status), ' ' + fmtDate(d.team.createdAt));
    tc.append(m, ...block(d.sections.team, d.team.answers));
  } else tc.append(el('p', 'Sin solicitud', 'meta'));
  wrap.append(fc, tc);
  return wrap;
}
async function toggle(btn, cell, id) {
  const open = btn.getAttribute('aria-expanded') !== 'true';
  btn.setAttribute('aria-expanded', String(open));
  cell.parentElement.hidden = !open;
  if (!open || cell.dataset.loaded) return;
  cell.replaceChildren(el('p', 'Cargando…', 'meta'));
  try {
    if (!cache.has(id)) cache.set(id, await api('usuarios?id=' + encodeURIComponent(id)));
    cell.replaceChildren(detail(cache.get(id)));
    cell.dataset.loaded = '1';
  } catch (e) {
    cell.replaceChildren(el('p', e.message, 'error'));
  }
}
function render() {
  const q = $('q').value.trim().toLowerCase();
  const list = items.filter(
    (u) => !q || (u.name || '').toLowerCase().includes(q) || String(u.discordId).includes(q),
  );
  $('count').textContent =
    `${items.length} cuenta${items.length === 1 ? '' : 's'}` +
    (q ? ` · ${list.length} coinciden` : '');
  $('rows').replaceChildren(
    ...list.flatMap((u) => {
      const d = el('td');
      const tog = el('button', null, 'tog');
      tog.type = 'button';
      tog.setAttribute('aria-expanded', 'false');
      const nm = el('span', u.name || '—');
      nm.append(el('small', u.discordId));
      tog.append(nm);
      d.append(tog);
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
              cache.delete(u.discordId);
              await load();
            } catch (e) {
              $('status').textContent = e.message;
            }
          },
        ),
      );
      const tr = el('tr', null, 'u');
      tr.append(
        d,
        el('td', fmtDate(u.since)),
        el('td', fmtDate(u.lastLogin)),
        f,
        t,
        el('td', u.access ? u.access.steamId : '—'),
        act,
      );
      const dr = el('tr', null, 'det');
      dr.hidden = true;
      const dc = el('td');
      dc.colSpan = COLS;
      dr.append(dc);
      tog.addEventListener('click', () => toggle(tog, dc, u.discordId));
      return [tr, dr];
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
