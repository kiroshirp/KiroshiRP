import { state } from './state.js';
import { api, lockSession } from './api.js';
import { overview, publication, refresh, renderFiles } from './catalog.js';
import { $, fail, setDirty, show } from './dom.js';
import { loadFile } from './editor-view.js';
import { discardOK, enter } from './session.js';
$('toggle-password').addEventListener('click', () => {
  const visible = $('login-password').type === 'password';
  $('login-password').type = visible ? 'text' : 'password';
  $('toggle-password').textContent = visible ? 'Ocultar contraseña' : 'Mostrar contraseña';
  $('toggle-password').setAttribute('aria-pressed', String(visible));
});
for (const event of ['keydown', 'keyup'])
  $('login-password').addEventListener(
    event,
    (e) => ($('caps-lock').hidden = !e.getModifierState('CapsLock')),
  );
$('login-password').addEventListener('blur', () => ($('caps-lock').hidden = true));
$('login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  event.submitter.disabled = true;
  $('login-error').hidden = true;
  try {
    const data = Object.fromEntries(new FormData(event.target));
    data.username = data.username.trim();
    await enter(await api('login', 'POST', data));
    show('Acceso autorizado.');
  } catch (error) {
    $('login-error').textContent = error.message;
    $('login-error').hidden = false;
  } finally {
    event.submitter.disabled = false;
  }
});
$('logout').addEventListener('click', async () => {
  if (!discardOK()) return;
  try {
    await api('logout', 'POST', {});
    lockSession(true);
    show('Sesión cerrada. Tus borradores guardados siguen en el servicio privado.');
  } catch (error) {
    fail(error);
  }
});
for (const id of ['search', 'filter', 'state-filter'])
  $(id).addEventListener(id === 'search' ? 'input' : 'change', renderFiles);
$('reload').addEventListener('click', async () => {
  if (state.working || !discardOK()) return;
  try {
    setDirty(false);
    await refresh();
    if (state.current) await loadFile(state.current.path);
    publication();
    show('Contenido actualizado.');
  } catch (error) {
    fail(error);
  }
});
$('check-publication').addEventListener('click', publication);
for (const button of document.querySelectorAll('[data-overview]'))
  button.addEventListener('click', () => {
    $('search').value = '';
    $('filter').value = button.dataset.overview === 'media' ? 'media' : '';
    $('state-filter').value = button.dataset.overview === 'drafts' ? 'privado' : '';
    if (button.dataset.overview === 'review') {
      $('state-filter').value = 'revision';
    }
    $('search').focus();
    renderFiles();
  });
