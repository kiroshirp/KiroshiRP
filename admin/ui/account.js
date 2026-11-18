const $ = (id) => document.getElementById(id);
const TITLES = {
  general: 'Vista general',
  personajes: 'Mis personajes',
  economia: 'Economía',
  cuenta: 'Mi cuenta',
  equipo: 'Únete al equipo',
};
// Ruta limpia de cada sección; 'cuenta' es la sección Mi cuenta (/cuenta/perfil).
const PATHS = {
  general: '/cuenta',
  personajes: '/cuenta/personajes',
  economia: '/cuenta/economia',
  cuenta: '/cuenta/perfil',
  equipo: '/cuenta/equipo',
};
const sectionOf = (path) =>
  Object.keys(PATHS).find((name) => PATHS[name] === path.replace(/[/]$/, '')) || 'general';
const MODULES = {
  personajes: '/cuenta/section-personajes.js',
  economia: '/cuenta/section-economia.js',
};
const mounted = {};
let session = null;
let user = null;
let team = null;
const stateName = () =>
  ({ aceptada: 'aceptada', rechazada: 'rechazada' })[team?.status] || 'pendiente de revisión';
let form = null;
let draftKey = '';

async function api(path, method = 'GET', body) {
  const response = await fetch('/cuenta/api/' + path, {
    method,
    credentials: 'same-origin',
    headers: method !== 'GET' ? { 'Content-Type': 'application/json' } : undefined,
    body: method !== 'GET' ? JSON.stringify(body || {}) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Ha ocurrido un error. Inténtalo de nuevo.');
  return data;
}
function el(tag, props, ...kids) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...kids);
  return node;
}
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
// Solo para marcado estático propio (nunca con datos del usuario).
const svg = (markup) => {
  const t = document.createElement('template');
  t.innerHTML = markup;
  return t.content.firstElementChild;
};
function toast(message, kind = 'ok') {
  const box = $('toasts');
  const node = el('div', {
    className: 'toast ' + kind,
    role: kind === 'error' ? 'alert' : 'status',
    textContent: message,
  });
  while (box.children.length >= 3) box.firstChild.remove();
  box.append(node);
  setTimeout(() => node.classList.add('out'), kind === 'error' ? 6500 : 3800);
  setTimeout(() => node.remove(), kind === 'error' ? 6800 : 4100);
}
function showError(message) {
  $('error').textContent = message || '';
  $('error').hidden = !message;
}
function countTo(node) {
  const to = +node.dataset.count;
  const sfx = node.dataset.sfx || '';
  if (reduce) return void (node.textContent = to + sfx);
  const t0 = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - t0) / 900);
    node.textContent = Math.round(to * (1 - (1 - k) ** 3)) + sfx;
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
const counter = (to, sfx = '', cls = 'stat-value') =>
  el('span', { className: cls, textContent: reduce ? to + sfx : '0' + sfx });
const io =
  'IntersectionObserver' in window
    ? new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (!e.isIntersecting) continue;
            io.unobserve(e.target);
            enter(e.target);
          }
        },
        { threshold: 0.1 },
      )
    : null;
function enter(node) {
  node.classList.add('in');
  for (const n of node.querySelectorAll('[data-count]')) countTo(n);
  for (const n of node.querySelectorAll('[data-p]')) n.style.setProperty('--p', n.dataset.p);
}
// Entrada escalonada al hacerse visibles.
function reveal(nodes) {
  nodes.forEach((node, i) => {
    node.classList.add('reveal');
    node.style.setProperty('--i', i);
    if (io) io.observe(node);
    else enter(node);
  });
}
function ring(value, label) {
  const wrap = el('div', { className: 'ring-wrap' });
  wrap.dataset.p = value;
  wrap.append(
    svg(
      '<svg class="ring" viewBox="0 0 120 120" aria-hidden="true"><circle class="ring-bg" cx="60" cy="60" r="52" pathLength="100"/><circle class="ring-fg" cx="60" cy="60" r="52" pathLength="100"/></svg>',
    ),
    label ?? el('span', { className: 'ring-num' }),
  );
  return wrap;
}
function avatar(text) {
  const a = svg(
    '<svg class="avatar" viewBox="0 0 100 100" aria-hidden="true"><polygon class="avatar-hex" points="50,4 91,27 91,73 50,96 9,73 9,27"/><polygon class="avatar-in" points="50,14 82,32 82,68 50,86 18,68 18,32"/><text class="avatar-t" x="50" y="52" text-anchor="middle" dominant-baseline="central"></text></svg>',
  );
  a.querySelector('text').textContent = text;
  return a;
}
const initialsOf = (name) =>
  (name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || '?';
const ui = { el, toast, reveal, ring, avatar, counter, initialsOf, reduce };
function formatDate(value) {
  const date = new Date(value);
  return isNaN(date) ? '' : date.toLocaleDateString('es-ES', { dateStyle: 'long' });
}
function formatDateTime(value) {
  const date = new Date(value);
  return isNaN(date) ? '' : date.toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' });
}
function head(eyebrow, title, lead) {
  return el(
    'div',
    { className: 'view-head' },
    el('p', { className: 'eyebrow', textContent: eyebrow }),
    el('h1', { textContent: title }),
    el('p', { className: 'lead', textContent: lead }),
  );
}
function stat(label, value) {
  return el(
    'div',
    { className: 'stat' },
    el('span', { className: 'stat-label', textContent: label }),
    el('span', { className: 'stat-value', textContent: value }),
  );
}

function teamText() {
  return team
    ? 'Solicitud ' + stateName() + ', enviada el ' + formatDate(team.createdAt) + '.'
    : 'Sin enviar. Solicitudes abiertas.';
}

function renderGeneral() {
  const root = $('general');
  const ch = session.character;
  const card = (href, title, value, text, extra) =>
    el(
      'a',
      { className: 'card link' + (extra ? ' has-ring' : ''), href },
      ...(extra ? [extra] : []),
      el(
        'div',
        { className: 'card-body' },
        el('h2', { textContent: title }),
        el('p', { className: 'stat-value', textContent: value }),
        el('p', { textContent: text }),
      ),
    );
  const pctNum = ch ? Math.round(ch.progress) : 0;
  const fichaRing = ring(pctNum);
  const num = fichaRing.querySelector('.ring-num');
  if (ch) {
    num.dataset.count = pctNum;
    num.dataset.sfx = '%';
    num.textContent = reduce ? pctNum + '%' : '0%';
  } else num.textContent = '—';
  const hero = head(
    'VISTA GENERAL',
    'Hola, ' + user.name + '.',
    'Resumen de tu cuenta y de tu actividad en KiroshiRP.',
  );
  hero.classList.add('hero');
  hero.prepend(
    el('img', {
      className: 'hero-logo',
      src: '/admin/brand.webp',
      alt: '',
      width: 132,
      height: 44,
    }),
  );
  const grid = el(
    'div',
    { className: 'card-grid' },
    card(
      PATHS.cuenta,
      'Cuenta',
      'Discord vinculado',
      session.since
        ? 'Miembro desde ' + formatDate(session.since) + '.'
        : 'Tu cuenta de Discord está vinculada.',
    ),
    card(PATHS.equipo, 'Solicitud al equipo', team ? 'Enviada' : 'Sin enviar', teamText()),
    card(
      PATHS.personajes,
      'Ficha de personaje',
      ch ? Math.round(ch.progress) + '%' : 'Sin empezar',
      ch ? 'Actualizada el ' + formatDate(ch.updatedAt) + '.' : 'Todavía no has empezado tu ficha.',
      fichaRing,
    ),
    card(PATHS.economia, 'Economía', 'Sin datos', 'Todavía no hay personajes en el juego.'),
  );
  root.replaceChildren(hero, grid);
  reveal([hero, ...grid.children]);
}

function renderAccount() {
  const root = $('cuenta');
  const others = session.others || 0;
  const closeOthers = el('button', {
    className: 'btn',
    type: 'button',
    textContent: 'Cerrar las otras sesiones',
    disabled: others === 0,
  });
  const logout = el('button', {
    className: 'btn',
    type: 'button',
    textContent: 'Cerrar esta sesión',
  });
  const del = el('button', {
    className: 'btn danger',
    type: 'button',
    textContent: 'Eliminar mis datos',
  });
  logout.addEventListener('click', async () => {
    try {
      await api('logout', 'POST');
      location.reload();
    } catch (error) {
      showError(error.message);
      toast(error.message, 'error');
    }
  });
  closeOthers.addEventListener('click', async () => {
    closeOthers.disabled = true;
    try {
      await api('sessions-close-others', 'POST');
      session.others = 0;
      renderAccount();
      toast('Otras sesiones cerradas.');
    } catch (error) {
      closeOthers.disabled = false;
      showError(error.message);
      toast(error.message, 'error');
    }
  });
  del.addEventListener('click', async () => {
    if (
      !confirm(
        'Se borrarán tu ficha de personaje, tu solicitud al equipo y todas tus sesiones. Esta acción no se puede deshacer. ¿Continuar?',
      )
    )
      return;
    try {
      await api('account-delete', 'POST');
      location.reload();
    } catch (error) {
      showError(error.message);
      toast(error.message, 'error');
    }
  });
  const grid = el(
    'div',
    { className: 'card-grid' },
    el(
      'div',
      { className: 'card' },
      el(
        'div',
        { className: 'id-head' },
        avatar(initialsOf(user.name)),
        el('h2', { textContent: 'Identidad de la cuenta' }),
      ),
      el(
        'div',
        { className: 'stats' },
        stat('Usuario', user.name),
        stat('Miembro desde', session.since ? formatDate(session.since) : '—'),
        stat('Discord', 'Vinculado'),
        stat('Vínculo con el juego', 'Todavía no disponible'),
      ),
    ),
    el(
      'div',
      { className: 'card' },
      el('h2', { textContent: 'Sesiones de la web' }),
      el(
        'p',
        {},
        'Esta sesión · ' +
          (session.expiresAt ? 'Caduca el ' + formatDateTime(session.expiresAt) + ' · ' : ''),
        el('span', { className: 'badge pulse', textContent: 'ACTUAL' }),
      ),
      el('p', {
        className: 'hint',
        textContent: others
          ? 'Otras sesiones abiertas: ' + others + '.'
          : 'No hay otras sesiones abiertas.',
      }),
      el('div', { className: 'actions' }, logout, closeOthers),
    ),
    el(
      'div',
      { className: 'card' },
      el('h2', { textContent: 'Tus datos' }),
      el('p', { className: 'hint', textContent: 'Borra tu ficha, tu solicitud y tus sesiones.' }),
      el('div', { className: 'actions' }, del),
    ),
  );
  root.replaceChildren(
    head(
      'IDENTIDAD Y SEGURIDAD',
      'Tu cuenta.',
      'Controla tu acceso a la web desde un mismo lugar.',
    ),
    grid,
  );
  reveal([...grid.children]);
}

async function mountModule(name) {
  const root = el('section', { id: name, className: 'module', ariaLabel: TITLES[name] });
  root.dataset.s = name;
  $('main').append(root);
  mounted[name] = root;
  try {
    const mod = await import(MODULES[name]);
    await mod.mount(root, { user, api, session, ui });
  } catch (error) {
    root.replaceChildren(
      el('p', {
        className: 'notice error',
        role: 'alert',
        textContent: 'No se ha podido cargar esta sección. Inténtalo de nuevo más tarde.',
      }),
    );
  }
}

let current = null;
function placeIndicator() {
  const link = document.querySelector('.side nav a[aria-current="page"]');
  const ind = $('nav-ind');
  if (!link || !ind) return;
  const set = (k, v) => ind.style.setProperty(k, v + 'px');
  set('--ix', link.offsetLeft);
  set('--iy', link.offsetTop);
  set('--iw', link.offsetWidth);
  set('--ih', link.offsetHeight);
  if (!ind.dataset.ready)
    requestAnimationFrame(() => requestAnimationFrame(() => (ind.dataset.ready = '1')));
}
function focusSection(name) {
  const section = document.querySelector('section[data-s="' + name + '"]');
  const target = section?.querySelector('h1') || section;
  if (!target) return;
  target.tabIndex = -1;
  target.focus({ preventScroll: true });
}
function route(navigated) {
  const name = sectionOf(location.pathname);
  const changed = name !== current;
  current = name;
  if (MODULES[name] && !mounted[name] && user) mountModule(name);
  for (const node of document.querySelectorAll('section[data-s]')) {
    node.hidden = node.dataset.s !== name;
    if (!node.hidden && changed) {
      node.classList.remove('enter');
      void node.offsetWidth;
      node.classList.add('enter');
    }
  }
  for (const link of document.querySelectorAll('nav a')) {
    if (link.dataset.s === name) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  $('title').textContent = TITLES[name];
  document.title = TITLES[name] + ' — KiroshiRP';
  showError('');
  placeIndicator();
  if (changed && navigated === true) focusSection(name);
}
addEventListener('resize', () => requestAnimationFrame(placeIndicator));
document.fonts?.ready.then(placeIndicator);
$('skip').addEventListener('click', (event) => {
  event.preventDefault();
  $('main').tabIndex = -1;
  $('main').focus();
});

function renderTeamState() {
  $('sent').hidden = !team;
  $('team-box').hidden = !!team;
  if (team)
    $('sent-text').textContent =
      'Tu solicitud está ' + stateName() + ' (enviada el ' + formatDate(team.createdAt) + ').';
  if (session) renderGeneral();
}

function readAnswers() {
  const answers = {};
  for (const input of $('fields').querySelectorAll('[name]')) answers[input.name] = input.value;
  return answers;
}
function updateProgress() {
  const required = form.sections.flatMap((s) => s.fields).filter((f) => f.required);
  const done = required.filter((f) => $('f-' + f.id).value.trim()).length;
  $('progress').max = required.length || 1;
  $('progress').value = done;
  $('bar-fill').style.setProperty('--p', done / (required.length || 1));
  form.sections.forEach((s, i) => {
    const req = s.fields.filter((f) => f.required);
    const d = req.filter((f) => $('f-' + f.id).value.trim()).length;
    const set = $('fields').children[i];
    if (!set) return;
    set.style.setProperty('--f', req.length ? d / req.length : 0);
    set.classList.toggle('done', req.length > 0 && d === req.length);
  });
  $('progress-text').textContent = done + ' de ' + required.length + ' obligatorios';
}
function saveDraft() {
  try {
    localStorage.setItem(draftKey, JSON.stringify(readAnswers()));
  } catch {}
}

function buildForm() {
  $('role-title').textContent = form.role.title;
  $('role-summary').textContent = form.role.summary;
  let draft = {};
  try {
    draft = JSON.parse(localStorage.getItem(draftKey)) || {};
  } catch {}
  const root = $('fields');
  root.replaceChildren();
  for (const section of form.sections) {
    const set = el('fieldset', {}, el('legend', { textContent: section.title }));
    for (const f of section.fields) {
      const id = 'f-' + f.id;
      let input;
      if (f.type === 'long') input = el('textarea', { maxLength: f.max || 1500 });
      else if (f.type === 'select') {
        input = el('select', {}, el('option', { value: '', textContent: 'Selecciona…' }));
        for (const o of f.options) input.append(el('option', { value: o, textContent: o }));
      } else if (f.type === 'number')
        input = el('input', { type: 'number', min: 1, max: 99, inputMode: 'numeric' });
      else input = el('input', { type: 'text', maxLength: f.max || 200 });
      input.id = id;
      input.name = f.id;
      input.required = !!f.required;
      const value = f.id === 'discord' && !draft.discord ? user.name : draft[f.id];
      if (typeof value === 'string') input.value = value;
      set.append(
        el(
          'div',
          { className: 'field' },
          el('label', { htmlFor: id, textContent: f.label + (f.required ? ' *' : '') }),
          input,
        ),
      );
    }
    root.append(set);
  }
  updateProgress();
}

$('team-form').addEventListener('input', () => {
  saveDraft();
  updateProgress();
});
$('team-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  showError('');
  const formEl = $('team-form');
  if (!formEl.checkValidity()) {
    toast('Revisa los campos obligatorios marcados con *.', 'error');
    return formEl.reportValidity();
  }
  const button = formEl.querySelector('button');
  button.disabled = true;
  try {
    const data = await api('team', 'POST', {
      answers: readAnswers(),
      consent: $('consent').checked,
    });
    team = { createdAt: data.createdAt, status: 'pendiente' };
    session.team = team;
    try {
      localStorage.removeItem(draftKey);
    } catch {}
    renderTeamState();
    scrollTo(0, 0);
    toast('Solicitud enviada.');
  } catch (error) {
    showError(error.message);
    toast(error.message, 'error');
  } finally {
    button.disabled = false;
  }
});
$('team-delete').addEventListener('click', async () => {
  if (!confirm('¿Eliminar tu solicitud y las respuestas guardadas?')) return;
  try {
    await api('team-delete', 'POST');
    team = null;
    session.team = null;
    renderTeamState();
    toast('Solicitud eliminada.');
  } catch (error) {
    showError(error.message);
    toast(error.message, 'error');
  }
});
addEventListener('popstate', () => route(true));
// Navegación interna sin recargar: solo para las rutas de las secciones (no /cuenta/login).
document.addEventListener('click', (event) => {
  const link = event.target.closest('a[href^="/cuenta"]');
  if (
    !link ||
    event.defaultPrevented ||
    event.button ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    link.target
  )
    return;
  if (!Object.values(PATHS).includes(link.pathname.replace(/[/]$/, '') || '/')) return;
  event.preventDefault();
  if (link.pathname !== location.pathname) history.pushState(null, '', link.pathname);
  route(true);
  scrollTo(0, 0);
});
// Direcciones antiguas con # (#personajes…) pasan a la ruta limpia.
if (PATHS[location.hash.slice(1)]) history.replaceState(null, '', PATHS[location.hash.slice(1)]);

async function load() {
  try {
    session = await api('session');
    $('loading').hidden = true;
    if (!session.user) {
      $('login').hidden = false;
      return;
    }
    user = session.user;
    team = session.team;
    draftKey = 'krp-team-draft-' + user.id;
    $('chip-name').textContent = user.name;
    $('chip-initial').textContent = (user.name.trim()[0] || '?').toUpperCase();
    renderGeneral();
    renderAccount();
    renderTeamState();
    $('app').hidden = false;
    route();
    form = await api('form');
    buildForm();
  } catch (error) {
    $('loading').hidden = true;
    $('app').hidden = false;
    route();
    showError(error.message);
  }
}
load();
