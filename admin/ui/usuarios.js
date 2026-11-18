import { api, el, fmtDate, state, setOnUnauth, start, mountNav, delButton } from './panel.js';
const $ = (id) => document.getElementById(id);
let items = [];
let filtered = [];
const cache = new Map();
const COLS = 7;
const PAGE = 25;
let page = 0;
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
// Nota interna del equipo (no la ve la persona).
function noteBox(d) {
  const box = el('section', null, 'card note-box');
  box.append(el('h2', 'Nota interna'));
  const area = el('textarea');
  area.maxLength = 2000;
  area.value = d.note?.text || '';
  area.setAttribute('aria-label', 'Nota interna');
  const meta = el('p', d.note ? 'Última edición: ' + d.note.by + ', ' + fmtDate(d.note.at) : 'Sin nota.', 'meta');
  const save = el('button', 'Guardar nota');
  save.type = 'button';
  save.addEventListener('click', async () => {
    try {
      await api('usuarios', 'PUT', { discordId: d.id, note: area.value });
      cache.delete(d.id);
      meta.textContent = 'Nota guardada.';
    } catch (e) {
      meta.textContent = e.message;
    }
  });
  box.append(area, meta, save, el('p', 'Solo la ve el equipo. No se incluye en la descarga de datos de la persona.', 'note'));
  return box;
}
function detail(d) {
  const wrap = el('div', null, 'det-grid');
  const fc = el('section', null, 'card');
  fc.append(el('h2', d.fichas.length > 1 ? 'Fichas de personaje (' + d.fichas.length + ')' : 'Ficha de personaje'));
  for (const ficha of d.fichas) {
    if (d.fichas.length > 1) fc.append(el('h3', 'Personaje ' + ficha.slot));
    fc.append(el('p', 'Actualizada: ' + fmtDate(ficha.updatedAt), 'meta'));
    const body = block(d.sections.ficha, ficha.values);
    fc.append(...body);
    if (!body.length) fc.append(el('p', 'Sin campos rellenados.', 'meta'));
    const imgs = ficha.images || [];
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
  }
  if (!d.fichas.length) fc.append(el('p', 'Sin ficha', 'meta'));
  fc.append(el('p', 'El apartado Secretos no se muestra: solo lo ve su autor.', 'note'));
  const tc = el('section', null, 'card');
  tc.append(el('h2', 'Solicitud al equipo'));
  if (d.team) {
    const m = el('p', null, 'meta');
    m.append(el('span', d.team.status, 'badge ' + d.team.status), ' ' + fmtDate(d.team.createdAt));
    tc.append(m, ...block(d.sections.team, d.team.answers));
  } else tc.append(el('p', 'Sin solicitud', 'meta'));
  wrap.append(fc, tc, noteBox(d));
  return wrap;
}
async function toggle(btn, cell, id) {
  const open = btn.getAttribute('aria-expanded') !== 'true';
  btn.setAttribute('aria-expanded', String(open));
  cell.parentElement.hidden = !open;
  if (!open || cell.dataset.loaded) return;
  cell.replaceChildren(el('p', 'Cargando…', 'meta'));
  try {
    if (!cache.has(id)) cache.set(id, { ...(await api('usuarios?id=' + encodeURIComponent(id))), id });
    cell.replaceChildren(detail(cache.get(id)));
    cell.dataset.loaded = '1';
  } catch (e) {
    cell.replaceChildren(el('p', e.message, 'error'));
  }
}
function render() {
  const q = $('q').value.trim().toLowerCase();
  const sorters = {
    lastLogin: (a, b) => (b.lastLogin || b.since || '').localeCompare(a.lastLogin || a.since || ''),
    since: (a, b) => (b.since || '').localeCompare(a.since || ''),
    name: (a, b) => (a.name || '~').localeCompare(b.name || '~', 'es'),
    character: (a, b) => (b.character?.progress || 0) - (a.character?.progress || 0),
  };
  filtered = items
    .filter((u) => !q || (u.name || '').toLowerCase().includes(q) || String(u.discordId).includes(q))
    .sort(sorters[$('sort').value] || sorters.lastLogin);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  page = Math.min(page, pages - 1);
  const list = filtered.slice(page * PAGE, page * PAGE + PAGE);
  $('pager').hidden = pages === 1;
  $('page').textContent = `Página ${page + 1} de ${pages}`;
  $('prev').disabled = page === 0;
  $('next').disabled = page >= pages - 1;
  $('count').textContent =
    `${items.length} cuenta${items.length === 1 ? '' : 's'}` +
    (q ? ` · ${filtered.length} coinciden` : '');
  $('status').textContent = list.length
    ? ''
    : items.length
      ? 'Ninguna cuenta coincide. Prueba con otro nombre o con el ID de Discord.'
      : 'Aún no hay cuentas. Aparecerán cuando alguien inicie sesión con Discord en «Mi cuenta».';
  $('rows').replaceChildren(
    ...list.flatMap((u) => {
      const d = el('td');
      const tog = el('button', null, 'tog');
      tog.type = 'button';
      tog.setAttribute('aria-expanded', 'false');
      const nm = el('span', u.name || '—');
      nm.append(el('small', u.discordId + (u.hasNote ? ' · con nota' : '')));
      tog.append(nm);
      d.append(tog);
      const f = el('td');
      if (u.character) {
        const p = Math.max(0, Math.min(100, Math.round(Number(u.character.progress) || 0)));
        const bar = el('progress');
        bar.max = 100;
        bar.value = p;
        bar.setAttribute('aria-label', 'Ficha completada al ' + p + '%');
        f.append(bar, ' ' + p + '%' + (u.characters > 1 ? ' · ' + u.characters + ' personajes' : ''));
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
$('q').addEventListener('input', () => ((page = 0), render()));
$('sort').addEventListener('change', () => ((page = 0), render()));
$('prev').addEventListener('click', () => (page--, render()));
$('next').addEventListener('click', () => (page++, render()));
// CSV de lo que se ve en la lista (con filtro y orden). Las celdas que empiezan por = + - @ se neutralizan contra inyección en hojas de cálculo.
const cell = (v) => {
  const t = String(v ?? '').replace(/^[=+\-@\t\r]/, "'$&");
  return '"' + t.replace(/"/g, '""') + '"';
};
$('csv').addEventListener('click', () => {
  const rows = [['Discord', 'Nombre', 'Alta', 'Último acceso', 'Ficha %', 'Solicitud', 'SteamID']].concat(
    filtered.map((u) => [u.discordId, u.name, u.since, u.lastLogin, u.character?.progress, u.team?.status, u.access?.steamId]),
  );
  const a = document.createElement('a');
  const csv = rows.map((r) => r.map(cell).join(',')).join('\n');
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' }));
  a.download = 'usuarios-kiroshirp.csv';
  a.click();
  URL.revokeObjectURL(a.href);
});
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
