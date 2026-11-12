import { state } from './state.js';
import { publication, refresh } from './catalog.js';
import { $ } from './dom.js';
export async function enter(session) {
  state.csrf = session.csrf;
  state.mode = session.mode;
  $('login-form').reset();
  $('login-error').hidden = true;
  $('login-password').type = 'password';
  $('toggle-password').textContent = 'Mostrar contraseña';
  $('toggle-password').setAttribute('aria-pressed', 'false');
  $('login').hidden = true;
  $('workspace').hidden = false;
  $('logout').hidden = false;
  $('mode').textContent = state.mode === 'github' ? 'CONECTADO / GITHUB' : 'EDICIÓN LOCAL';
  $('publish').textContent =
    state.mode === 'github' ? 'Revisar publicación →' : 'Revisar guardado →';
  await refresh();
  publication();
}
export function discardOK() {
  return !state.dirty || confirm('Tienes cambios sin guardar. ¿Quieres descartarlos?');
}
