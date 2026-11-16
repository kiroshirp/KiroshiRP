const $ = (id) => document.getElementById(id);
const TITLES = {
  general: 'Vista general',
  personajes: 'Mis personajes',
  economia: 'Economía',
  cuenta: 'Mi cuenta',
  equipo: 'Únete al equipo',
};
const MODULES = {
  personajes: '/cuenta/section-personajes.js',
  economia: '/cuenta/section-economia.js',
};
const mounted = {};
let session = null;
let user = null;
let team = null;
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
function showError(message) {
  $('error').textContent = message || '';
  $('error').hidden = !message;
}
function el(tag, props, ...kids) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...kids);
  return node;
}
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
    ? 'Solicitud enviada el ' + formatDate(team.createdAt) + '.'
    : 'Sin enviar. Solicitudes abiertas.';
}

function renderGeneral() {
  const root = $('general');
  const ch = session.character;
  const card = (href, title, value, text) =>
    el(
      'a',
      { className: 'card link', href },
      el('h2', { textContent: title }),
      el('p', { className: 'stat-value', textContent: value }),
      el('p', { textContent: text }),
    );
  root.replaceChildren(
    head(
      'VISTA GENERAL',
      'Hola, ' + user.name + '.',
      'Resumen de tu cuenta y de tu actividad en KiroshiRP.',
    ),
    el(
      'div',
      { className: 'card-grid' },
      card(
        '#cuenta',
        'Cuenta',
        'Discord vinculado',
        session.since
          ? 'Miembro desde ' + formatDate(session.since) + '.'
          : 'Tu cuenta de Discord está vinculada.',
      ),
      card('#equipo', 'Solicitud al equipo', team ? 'Enviada' : 'Sin enviar', teamText()),
      card(
        '#personajes',
        'Ficha de personaje',
        ch ? Math.round(ch.progress) + '%' : 'Sin empezar',
        ch
          ? 'Actualizada el ' + formatDate(ch.updatedAt) + '.'
          : 'Todavía no has empezado tu ficha.',
      ),
      card('#economia', 'Economía', 'Sin datos', 'Todavía no hay personajes en el juego.'),
    ),
  );
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
    }
  });
  closeOthers.addEventListener('click', async () => {
    closeOthers.disabled = true;
    try {
      await api('sessions-close-others', 'POST');
      session.others = 0;
      renderAccount();
    } catch (error) {
      closeOthers.disabled = false;
      showError(error.message);
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
    }
  });
  root.replaceChildren(
    head(
      'IDENTIDAD Y SEGURIDAD',
      'Tu cuenta.',
      'Controla tu acceso a la web desde un mismo lugar.',
    ),
    el(
      'div',
      { className: 'card-grid' },
      el(
        'div',
        { className: 'card' },
        el('h2', { textContent: 'Identidad de la cuenta' }),
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
          el('span', { className: 'badge', textContent: 'ACTUAL' }),
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
    ),
  );
}

async function mountModule(name) {
  const root = el('section', { id: name, className: 'module', ariaLabel: TITLES[name] });
  root.dataset.s = name;
  $('main').append(root);
  mounted[name] = root;
  try {
    const mod = await import(MODULES[name]);
    await mod.mount(root, { user, api, session });
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

function route() {
  const hash = location.hash.slice(1);
  const name = TITLES[hash] ? hash : 'general';
  if (MODULES[name] && !mounted[name] && user) mountModule(name);
  for (const node of document.querySelectorAll('section[data-s]'))
    node.hidden = node.dataset.s !== name;
  for (const link of document.querySelectorAll('nav a')) {
    if (link.dataset.s === name) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  $('title').textContent = TITLES[name];
  showError('');
}

function renderTeamState() {
  $('sent').hidden = !team;
  $('team-box').hidden = !!team;
  if (team)
    $('sent-text').textContent = 'Tu solicitud fue enviada el ' + formatDate(team.createdAt) + '.';
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
  if (!formEl.checkValidity()) return formEl.reportValidity();
  const button = formEl.querySelector('button');
  button.disabled = true;
  try {
    const data = await api('team', 'POST', {
      answers: readAnswers(),
      consent: $('consent').checked,
    });
    team = { createdAt: data.createdAt };
    session.team = team;
    try {
      localStorage.removeItem(draftKey);
    } catch {}
    renderTeamState();
    scrollTo(0, 0);
  } catch (error) {
    showError(error.message);
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
  } catch (error) {
    showError(error.message);
  }
});
addEventListener('hashchange', route);

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
