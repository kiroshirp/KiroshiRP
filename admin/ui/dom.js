import { state } from './state.js';
export const $ = (id) => document.getElementById(id);
export const known = ['title', 'description', 'category', 'status', 'origin', 'updated'];
export const labels = {
  lore: 'Lore',
  mecanicas: 'Mecánicas',
  normativas: 'Normativas',
  facciones: 'Facciones',
  guias: 'Guías',
  actualizaciones: 'Actualizaciones',
  settings: 'Configuración',
  media: 'Imágenes',
};
export function show(text) {
  $('message').textContent = text;
}
export function fail(error) {
  const message = error.message || 'No se pudo completar la operación.';
  show(message);
  if (!$('editor-form').hidden) {
    $('editor-error').textContent = message;
    $('editor-error').hidden = false;
  }
}
export function setDirty(value) {
  state.dirty = value;
  $('dirty').textContent = value
    ? 'Cambios sin guardar'
    : state.current?.draftRevision
      ? 'Borrador privado guardado'
      : 'Sin cambios pendientes';
}
export function busy(value) {
  state.working = value;
  if (value) {
    state.disabledControls = new Map(
      [...$('editor-form').querySelectorAll('input,textarea,select,button')].map((control) => [
        control,
        control.disabled,
      ]),
    );
    for (const control of state.disabledControls.keys()) control.disabled = true;
  } else {
    for (const [control, disabled] of state.disabledControls)
      if (control.isConnected) control.disabled = disabled;
    state.disabledControls.clear();
  }
  for (const id of [
    'save-draft',
    'publish',
    'validate',
    'confirm-publish',
    'delete',
    'delete-draft',
    'new',
    'upload',
  ])
    $(id).disabled = value;
  $('editor-form').setAttribute('aria-busy', String(value));
}
