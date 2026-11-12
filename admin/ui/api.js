import { state } from './state.js';
import { $, setDirty } from './dom.js';
export function lockSession(clear = false) {
  state.csrf = '';
  state.catalogGeneration++;
  $('workspace').hidden = true;
  $('logout').hidden = true;
  $('login').hidden = false;
  if (clear) {
    state.current = null;
    state.files = [];
    state.drafts = [];
    state.extra = {};
    state.settingsValue = {};
    $('editor-form').reset();
    $('image-preview').removeAttribute('src');
    $('files').replaceChildren();
    setDirty(false);
  }
}
export async function api(endpoint, method = 'GET', data) {
  const response = await fetch('/admin/api/' + endpoint, {
    method,
    credentials: 'same-origin',
    headers:
      method === 'GET' ? {} : { 'Content-Type': 'application/json', 'X-CSRF-Token': state.csrf },
    ...(data ? { body: JSON.stringify(data) } : {}),
  });
  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error('El servicio no respondió correctamente. Vuelve a intentarlo.');
  }
  if (!response.ok) {
    if (response.status === 401 && endpoint !== 'login') lockSession();
    throw Object.assign(new Error(body.error || 'Error del servicio.'), {
      status: response.status,
    });
  }
  return body;
}
