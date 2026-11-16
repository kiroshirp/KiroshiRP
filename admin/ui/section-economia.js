// Sección «Economía» de /cuenta/. Estado vacío: no hay servidor de juego conectado todavía.

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function stat(label, value) {
  const box = el('div', 'stat');
  box.append(el('div', 'stat-label', label), el('div', 'stat-value', value));
  return box;
}

export async function mount(root) {
  const head = el('div', 'view-head');
  head.append(
    el('p', 'eyebrow', 'REGISTRO DE EDDIES'),
    el('h1', null, 'Tu economía.'),
    el(
      'p',
      'lead',
      'Consulta los movimientos reales de cada personaje. Los pagos se realizan dentro del juego.',
    ),
  );

  const stats = el('div', 'stats');
  stats.append(
    stat('PERSONAJE', 'Sin personajes registrados'),
    stat('EDDIES DISPONIBLES', '—'),
    stat('CUENTA DEL PERSONAJE', 'Sin actividad registrada'),
  );

  const table = el('table', 'table');
  const thead = el('thead');
  const headRow = el('tr');
  for (const title of ['CONCEPTO', 'FECHA', 'IMPORTE', 'SALDO']) {
    const th = el('th', null, title);
    th.setAttribute('scope', 'col');
    headRow.append(th);
  }
  thead.append(headRow);
  table.append(thead, el('tbody'));

  const card = el('div', 'card');
  card.append(
    el('h2', null, 'Últimos movimientos'),
    table,
    el(
      'div',
      'empty',
      'Tus movimientos aparecerán cuando hayas creado un personaje dentro del juego.',
    ),
  );

  const grid = el('div', 'card-grid');
  grid.append(card);

  const notice = el(
    'div',
    'notice',
    'Esta sección todavía no está conectada al servidor de juego, por eso no muestra datos.',
  );

  root.append(head, stats, grid, notice);
}
