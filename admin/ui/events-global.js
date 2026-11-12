import { state } from './state.js';
import { $ } from './dom.js';
import { saveDraft } from './editor-view.js';
window.addEventListener('beforeunload', (event) => {
  if (state.dirty) event.preventDefault();
});
document.addEventListener('keydown', (event) => {
  if (
    (event.ctrlKey || event.metaKey) &&
    event.key.toLowerCase() === 's' &&
    state.current &&
    !$('workspace').hidden
  ) {
    event.preventDefault();
    saveDraft();
  }
});
