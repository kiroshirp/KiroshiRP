import { api, el, fmtDate, start, delButton, state } from './panel.js';
const $ = (id) => document.getElementById(id);
let data = { items: [], labels: {}, templates: [], internals: [] };
const INT = { 'en-revision': 'En revisión', entrevista: 'Entrevista', 'en-espera': 'En espera' };
const open = new Set();
async function act(fn) {
  try {
    await fn();
    await load();
  } catch (e) {
    $('status').textContent = e.message;
  }
}
function render() {
  const f = $('fs').value,
    dir = $('ord').value === 'asc' ? 1 : -1;
  const list = data.items
    .filter((i) => !f || i.status === f)
    .filter((i) => !$('fi').value || i.internal === $('fi').value)
    .filter((i) => !$('mine').checked || (i.reviewer && i.reviewer === state.actor?.name))
    .sort((a, b) => dir * (new Date(a.createdAt) - new Date(b.createdAt)));
  $('status').textContent = list.length
    ? `${list.length} candidatura${list.length === 1 ? '' : 's'}.`
    : 'Aún no hay candidaturas. Llegan desde «Únete al equipo» en la cuenta de cada jugador.';
  $('list').replaceChildren(
    ...list.map((i) => {
      const d = el('details');
      d.open = open.has(i.discordId);
      d.addEventListener('toggle', () =>
        d.open ? open.add(i.discordId) : open.delete(i.discordId),
      );
      const s = el('summary');
      s.append(
        el('b', i.discordName || i.discordId),
        el('span', fmtDate(i.createdAt)),
        el('span', i.status, 'badge ' + i.status),
      );
      if (i.internal) s.append(el('span', INT[i.internal] || i.internal, 'badge'));
      if (i.reviewer) s.append(el('span', 'Revisa: ' + i.reviewer));
      const dl = el('dl');
      for (const [k, v] of Object.entries(i.answers || {}))
        dl.append(el('dt', data.labels?.[k] || k), el('dd', v));
      const put = (extra) => act(() => api('equipo', 'PUT', { discordId: i.discordId, ...extra }));
      const btn = (label, fn, cls) => {
        const b = el('button', label, cls);
        b.type = 'button';
        b.addEventListener('click', fn);
        return b;
      };
      const field = (label, ctl) => {
        const l = el('label', label);
        l.append(ctl);
        return l;
      };
      const sel = el('select');
      for (const v of ['', ...data.internals]) {
        const o = el('option', v ? INT[v] || v : 'Sin estado interno');
        o.value = v;
        sel.append(o);
      }
      sel.value = i.internal || '';
      sel.addEventListener('change', () => put({ internal: sel.value }));
      const mine = i.reviewer && i.reviewer === state.actor?.name;
      const rev = btn(i.reviewer ? 'Quitar revisor' : 'Asignarme', () =>
        put({ reviewer: i.reviewer ? '' : true }),
      );
      const note = el('textarea');
      note.rows = 3;
      note.maxLength = 1000;
      note.value = i.note?.text || '';
      const manage = el('div', null, 'cand-manage');
      manage.append(
        field('Estado interno', sel),
        el(
          'p',
          i.reviewer ? 'Revisor: ' + i.reviewer + (mine ? ' (tú)' : '') : 'Sin revisor.',
          'hint',
        ),
        rev,
        field('Nota interna', note),
        btn('Guardar nota', () => put({ note: note.value.trim() })),
      );
      if (i.note?.by)
        manage.append(el('p', `Nota de ${i.note.by} · ${fmtDate(i.note.at)}`, 'hint'));
      const tpl = el('select');
      const t0 = el('option', 'Sin plantilla');
      t0.value = '';
      tpl.append(t0);
      data.templates.forEach((t, n) => {
        const o = el('option', t.title);
        o.value = n;
        tpl.append(o);
      });
      const msg = el('textarea');
      msg.rows = 4;
      msg.maxLength = 1500;
      msg.placeholder = 'Opcional. Usa {nombre} para el nombre del jugador.';
      tpl.addEventListener('change', () => (msg.value = data.templates[tpl.value]?.text || ''));
      const acts = el('div', null, 'acts');
      for (const [label, status] of [
        ['Aceptar', 'aceptada'],
        ['Rechazar', 'rechazada'],
        ['Volver a pendiente', 'pendiente'],
      ]) {
        const b = btn(label, () => {
          const m = msg.value.trim();
          put({ status, ...(m && status !== 'pendiente' ? { message: m } : {}) });
        });
        b.disabled = i.status === status;
        acts.append(b);
      }
      acts.append(
        delButton('Eliminar', '¿Eliminar esta candidatura? No se puede deshacer.', () =>
          act(() => api('equipo', 'DELETE', { discordId: i.discordId })),
        ),
      );
      const decide = el('div', null, 'cand-manage');
      decide.append(
        field('Plantilla de mensaje', tpl),
        field('Mensaje por Discord (opcional, al aceptar o rechazar)', msg),
        acts,
      );
      const body = el('div', null, 'body');
      body.append(dl, manage, decide);
      d.append(s, body);
      return d;
    }),
  );
}
async function load() {
  data = await api('equipo');
  fillInternals();
  render();
  if (!tplLoaded) {
    tplLoaded = true;
    drawTpl(data.templates);
  }
}
let tplLoaded = false;
function fillInternals() {
  if ($('fi').options.length > 1) return;
  for (const v of data.internals) {
    const o = el('option', INT[v] || v);
    o.value = v;
    $('fi').append(o);
  }
}
// Editor de plantillas: lista editable que se guarda entera.
function drawTpl(list) {
  const rows = $('tpl-rows');
  rows.replaceChildren();
  const add = (t = { title: '', text: '' }) => {
    const r = el('div', null, 'tpl-row');
    const ti = el('input');
    ti.maxLength = 60;
    ti.value = t.title;
    ti.setAttribute('aria-label', 'Título de la plantilla');
    const tx = el('textarea');
    tx.rows = 3;
    tx.maxLength = 1500;
    tx.value = t.text;
    tx.setAttribute('aria-label', 'Texto de la plantilla');
    const del = el('button', 'Borrar', 'danger');
    del.type = 'button';
    del.addEventListener('click', () => r.remove());
    r.append(ti, tx, del);
    rows.append(r);
  };
  list.forEach((t) => add(t));
  $('tpl-add').onclick = () => add();
  $('tpl-save').onclick = async () => {
    const templates = [...rows.children]
      .map((r) => ({
        title: r.querySelector('input').value.trim(),
        text: r.querySelector('textarea').value.trim(),
      }))
      .filter((t) => t.title || t.text);
    try {
      await api('plantillas', 'PUT', { templates });
      $('tpl-status').textContent = 'Plantillas guardadas.';
      tplLoaded = false;
      await load();
    } catch (e) {
      $('tpl-status').textContent = e.message;
    }
  };
}
$('fs').addEventListener('change', render);
$('ord').addEventListener('change', render);
$('fi').addEventListener('change', render);
$('mine').addEventListener('change', render);
start(() => load().catch((e) => ($('status').textContent = e.message)));
