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

// Esquema vectorial estático: ejes y monedero sin datos (la línea punteada es solo guía, no un valor).
const ART =
  '<svg class="eco-art" viewBox="0 0 320 180" aria-hidden="true">' +
  '<g class="eco-grid"><path d="M30 20H300M30 60H300M30 100H300M30 140H300"/></g>' +
  '<path class="eco-axis" d="M30 14V146H304"/>' +
  '<path class="eco-line" pathLength="100" d="M30 120H300"/>' +
  '<g class="eco-wallet"><rect x="196" y="38" width="86" height="58" rx="8"/>' +
  '<path d="M196 54H282M258 67h24v16h-24z"/><circle cx="268" cy="75" r="2.5"/></g>' +
  '<g class="eco-coin"><ellipse cx="86" cy="104" rx="26" ry="8"/><path d="M60 104v10c0 4 12 8 26 8s26-4 26-8v-10"/>' +
  '<ellipse cx="86" cy="88" rx="26" ry="8"/><path d="M60 88v10M112 88v10"/></g>' +
  '</svg>';

export async function mount(root, ctx) {
  if (!document.querySelector('link[href="/cuenta/section-economia.css"]')) {
    const link = el('link');
    link.rel = 'stylesheet';
    link.href = '/cuenta/section-economia.css';
    document.head.append(link);
  }
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

  const art = el('div', 'card eco-card');
  art.insertAdjacentHTML('afterbegin', ART);
  art.append(el('p', 'eco-cap', 'Sin datos todavía'));

  const grid = el('div', 'card-grid eco-grid-wrap');
  grid.append(card, art);

  const notice = el(
    'div',
    'notice',
    'Esta sección todavía no está conectada al servidor de juego, por eso no muestra datos.',
  );

  root.append(head, stats, grid, notice);
  ctx?.ui?.reveal([...stats.children, ...grid.children]);
}
