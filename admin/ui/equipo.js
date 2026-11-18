import { api, el, fmtDate, start, delButton } from './panel.js';
const $ = (id) => document.getElementById(id);
let data = { items: [], labels: {} };
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
      const dl = el('dl');
      for (const [k, v] of Object.entries(i.answers || {}))
        dl.append(el('dt', data.labels?.[k] || k), el('dd', v));
      const acts = el('div', null, 'acts');
      for (const [label, status] of [
        ['Aceptar', 'aceptada'],
        ['Rechazar', 'rechazada'],
        ['Volver a pendiente', 'pendiente'],
      ]) {
        const b = el('button', label);
        b.type = 'button';
        b.disabled = i.status === status;
        b.addEventListener('click', () =>
          act(() => api('equipo', 'PUT', { discordId: i.discordId, status })),
        );
        acts.append(b);
      }
      acts.append(
        delButton('Eliminar', '¿Eliminar esta candidatura? No se puede deshacer.', () =>
          act(() => api('equipo', 'DELETE', { discordId: i.discordId })),
        ),
      );
      const body = el('div', null, 'body');
      body.append(dl, acts);
      d.append(s, body);
      return d;
    }),
  );
}
async function load() {
  data = await api('equipo');
  render();
}
$('fs').addEventListener('change', render);
$('ord').addEventListener('change', render);
start(() => load().catch((e) => ($('status').textContent = e.message)));
