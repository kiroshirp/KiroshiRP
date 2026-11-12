// Punto de entrada del panel: conecta los módulos y recupera la sesión si existe.
import { fail } from './dom.js';
import { api } from './api.js';
import { enter } from './session.js';
import './events-session.js';
import './events-editor.js';
import './events-media.js';
import './events-global.js';

document
  .querySelector('.workspace-heading .actions')
  .insertAdjacentHTML('afterbegin', '<a class="button" href="/admin/solicitudes/">Solicitudes</a>');

api('session')
  .then(enter)
  .catch((error) => {
    if (error.status !== 401) fail(error);
  });
