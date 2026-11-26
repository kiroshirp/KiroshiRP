import { api, el, start } from './panel.js';
const $ = (id) => document.getElementById(id);
const STEPS = [
  ['discord', 'Entraron con Discord'],
  ['ficha', 'Ficha al 50 % o más'],
  ['solicitud', 'Solicitud enviada'],
  ['aceptada', 'Aceptada'],
];
function draw({ days = [], funnel = {}, pendientes }) {
  const max = Math.max(1, ...days.map((d) => d.count));
  const total = days.reduce((n, d) => n + d.count, 0);
  $('bars').setAttribute(
    'aria-label',
    `Altas por día, últimos ${days.length} días: ${total} en total.`,
  );
  $('bars').replaceChildren(
    ...days.map((d) => {
      const col = el('div', null, 'bar');
      col.title = `${d.date}: ${d.count}`;
      const fill = el('i');
      fill.style.height = (d.count / max) * 100 + '%';
      col.append(fill);
      return col;
    }),
  );
  $('days').replaceChildren(
    ...days.map((d) => {
      const tr = el('tr');
      tr.append(el('td', d.date), el('td', String(d.count)));
      return tr;
    }),
  );
  const top = funnel.discord || 0;
  $('funnel').replaceChildren(
    ...STEPS.map(([k, label]) => {
      const n = funnel[k] || 0;
      const pct = top ? Math.round((n / top) * 100) : 0;
      const li = el('li');
      const bar = el('span', null, 'fbar');
      const fill = el('i');
      fill.style.width = pct + '%';
      bar.append(fill);
      li.append(el('b', label), el('span', `${n} · ${pct} %`), bar);
      return li;
    }),
  );
  $('status').textContent =
    `${total} altas en los últimos ${days.length} días. Candidaturas pendientes: ${pendientes ?? 0}.`;
}
start(() =>
  api('estadisticas')
    .then(draw)
    .catch((e) => ($('status').textContent = e.message)),
);
