import { api, el, fmtDate, start } from './panel.js';
const $ = (id) => document.getElementById(id);
const ACCIONES = {
  'inicio-sesion': 'Inicio de sesión',
  'cuenta-eliminada': 'Cuenta eliminada',
  'candidatura-estado': 'Estado de candidatura',
  'candidatura-eliminada': 'Candidatura eliminada',
  'solicitud-acceso-eliminada': 'Solicitud de acceso eliminada',
};
const METODOS = { discord: 'Discord', password: 'Contraseña' };
function fila(i) {
  const quien = el('td');
  quien.append(
    el('span', i.actor?.name || i.actor?.id || '—'),
    ' ',
    el('span', METODOS[i.actor?.method] || i.actor?.method || '—', 'badge'),
  );
  let afectado = '—';
  if (i.target) {
    afectado = `${i.target.name} (${i.target.id})`;
    if (i.target.detail) afectado += ' → ' + i.target.detail;
  }
  const tr = el('tr');
  tr.append(
    el('td', fmtDate(i.at)),
    quien,
    el('td', ACCIONES[i.action] || i.action),
    el('td', afectado),
  );
  return tr;
}
async function load() {
  try {
    const { items } = await api('registro');
    $('rows').replaceChildren(...items.map(fila));
    $('status').textContent = items.length ? '' : 'Aún no hay acciones. Aquí verás quién entra al panel y qué cambia el equipo.';
  } catch (e) {
    $('status').textContent = e.message;
  }
}
$('refresh').addEventListener('click', load);
start(load);
