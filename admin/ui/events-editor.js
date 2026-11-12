import { state } from './state.js';
import { api } from './api.js';
import { group, publication, refresh } from './catalog.js';
import { $, busy, fail, labels, setDirty, show } from './dom.js';
import {
  collect,
  editorTab,
  loadFile,
  openEditor,
  options,
  renderRelated,
  renderSettings,
  renderSources,
  saveDraft,
  syncExtra,
  wordCount,
} from './editor-view.js';
import { discardOK } from './session.js';
import { slugify } from './editor.js';
$('editor-form').addEventListener('input', (event) => {
  if (event.target.id === 'metadata') state.metadataRaw = true;
  if (event.target.id === 'settings') state.settingsRaw = true;
  setDirty(true);
  if (event.target.id === 'body') wordCount();
});
for (const button of document.querySelectorAll('[data-editor-tab]'))
  button.addEventListener('click', () => {
    try {
      editorTab(button.dataset.editorTab === 'preview');
    } catch (error) {
      fail(error);
    }
  });
for (const button of document.querySelectorAll('[data-format]'))
  button.addEventListener('click', () => {
    const field = $('body');
    const selected = field.value.slice(field.selectionStart, field.selectionEnd) || 'Texto';
    const formats = {
      heading: '\n## ' + selected + '\n',
      bold: '**' + selected + '**',
      list: '\n- ' + selected + '\n',
      link: '[' + selected + '](https://)',
      quote: '\n> ' + selected + '\n',
    };
    field.setRangeText(
      formats[button.dataset.format],
      field.selectionStart,
      field.selectionEnd,
      'end',
    );
    field.focus();
    setDirty(true);
    wordCount();
  });
$('add-source').addEventListener('click', () => {
  state.extra.sources ||= [];
  state.extra.sources.push({ label: '', url: '' });
  syncExtra();
  renderSources();
  setDirty(true);
});
$('add-related').addEventListener('click', () => {
  const path = $('related-choice').value;
  if (!path) return;
  state.extra.related ||= [];
  if (!state.extra.related.includes(path)) state.extra.related.push(path);
  syncExtra();
  renderRelated();
  setDirty(true);
});
$('apply-metadata').addEventListener('click', () => {
  try {
    const value = JSON.parse($('metadata').value);
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new Error('Introduce un objeto JSON válido.');
    state.extra = value;
    state.metadataRaw = false;
    options();
    setDirty(true);
    show('Opciones aplicadas al formulario.');
  } catch (error) {
    fail(error);
  }
});
$('apply-settings').addEventListener('click', () => {
  try {
    state.settingsValue = JSON.parse($('settings').value);
    renderSettings();
    setDirty(true);
    show('Configuración cargada en el formulario.');
  } catch (error) {
    fail(error);
  }
});
$('save-draft').addEventListener('click', saveDraft);
$('validate').addEventListener('click', async () => {
  if (state.working || !state.current) return;
  busy(true);
  $('editor-error').hidden = true;
  try {
    const result = await api('validate', 'POST', collect());
    if (result.conflict)
      throw new Error(
        'El archivo publicado ha cambiado. Guarda tu borrador y revisa la versión actual antes de publicar.',
      );
    show('Validación correcta. Los datos están preparados para revisión.');
  } catch (error) {
    fail(error);
  } finally {
    busy(false);
  }
});
$('editor-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (state.working || !state.current) return;
  busy(true);
  $('editor-error').hidden = true;
  try {
    state.pending = collect();
    const result = await api('validate', 'POST', state.pending);
    if (result.conflict)
      throw new Error(
        'La versión publicada ha cambiado. Conserva tu borrador y revisa los cambios antes de publicar.',
      );
    $('publish-title').textContent =
      state.mode === 'github'
        ? '¿Publicar estos cambios?'
        : '¿Guardar en los archivos del proyecto?';
    $('publish-summary').replaceChildren();
    for (const text of [
      state.current.document?.metadata?.title || $('file-title').textContent,
      state.current.path,
      state.pending.document
        ? 'Estado editorial: ' + state.pending.document.metadata.status
        : 'Configuración del portal',
    ]) {
      const p = document.createElement('p');
      p.textContent = text;
      $('publish-summary').append(p);
    }
    $('publish-help').textContent =
      state.mode === 'github'
        ? state.pending.document &&
          group(state.current.path) === 'actualizaciones' &&
          !state.pending.document.metadata.published
          ? 'Esta noticia se guardará en el repositorio, pero no aparecerá en el portal.'
          : 'Los cambios se enviarán a GitHub y se publicarán al finalizar las comprobaciones. El estado editorial Borrador no oculta los artículos de documentación.'
        : 'Se modificarán los archivos locales, con copia de seguridad. No se publicará en Internet.';
    $('confirm-publish').textContent =
      state.mode === 'github' ? 'Confirmar publicación' : 'Guardar en archivos';
    $('publish-dialog').showModal();
  } catch (error) {
    fail(error);
  } finally {
    busy(false);
  }
});
$('cancel-publish').addEventListener('click', () => $('publish-dialog').close());
$('confirm-publish').addEventListener('click', async () => {
  if (state.working || !state.pending) return;
  busy(true);
  try {
    await api('file', 'PUT', state.pending);
    const path = state.pending.path;
    state.pending = null;
    $('publish-dialog').close();
    setDirty(false);
    await refresh();
    openEditor(await api('file?path=' + encodeURIComponent(path)));
    show(
      state.mode === 'github'
        ? 'Revisión enviada a GitHub. Comprueba la publicación en la barra de estado.'
        : 'Cambios guardados en los archivos locales.',
    );
    publication();
  } catch (error) {
    $('publish-dialog').close();
    fail(error);
  } finally {
    busy(false);
  }
});
$('discard').addEventListener('click', () => {
  if (state.current && discardOK()) {
    setDirty(false);
    loadFile(state.current.path).catch(fail);
  }
});
$('delete-draft').addEventListener('click', async () => {
  if (
    state.working ||
    !state.current?.draftRevision ||
    !confirm('¿Eliminar este borrador privado? La versión publicada no cambia.')
  )
    return;
  busy(true);
  try {
    const path = state.current.path;
    await api('draft', 'DELETE', { path, draftRevision: state.current.draftRevision });
    setDirty(false);
    state.current = null;
    await refresh();
    if (state.files.some((f) => f.path === path))
      openEditor(await api('file?path=' + encodeURIComponent(path)));
    else {
      $('editor-form').hidden = true;
      $('welcome').hidden = false;
    }
    show('Borrador privado eliminado.');
  } catch (error) {
    fail(error);
  } finally {
    busy(false);
  }
});
$('delete').addEventListener('click', async () => {
  if (state.working || !state.current) return;
  const path = state.current.path;
  const confirmation = prompt(
    'Eliminar este archivo afecta a la versión publicada y puede romper enlaces. Su versión anterior se conserva en el historial. Escribe la ruta completa para confirmar:\n' +
      path,
  );
  if (confirmation !== path) return;
  busy(true);
  try {
    await api('file', 'DELETE', { path, version: state.current.version, confirm: path });
    setDirty(false);
    state.current = null;
    $('editor-form').hidden = true;
    $('welcome').hidden = false;
    await refresh();
    show('Archivo eliminado. Su versión anterior se conserva en el historial o copia local.');
  } catch (error) {
    fail(error);
  } finally {
    busy(false);
  }
});
$('new').addEventListener('click', () => {
  if (discardOK()) {
    $('create-form').reset();
    $('create-dialog').showModal();
  }
});
$('cancel-create').addEventListener('click', () => $('create-dialog').close());
$('create-form').elements.name.addEventListener('input', (event) => {
  $('create-form').elements.slug.value = slugify(event.target.value);
});
$('create-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.target));
  const path = 'src/content/' + data.section + '/' + data.slug + '.md';
  if ([...state.files, ...state.drafts].some((f) => f.path === path)) {
    show('Ya existe un archivo o borrador con ese identificador.');
    return;
  }
  $('create-dialog').close();
  openEditor({
    path,
    version: '',
    document: {
      metadata: {
        title: data.name,
        description: '',
        category: labels[data.section],
        status: 'Borrador',
        origin: 'LORE KIROSHIRP',
        updated: new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Madrid' }).format(new Date()),
        published: false,
        related: [],
        sources: [],
        history: [],
      },
      body: '## Introducción\n\n',
    },
  });
  setDirty(true);
  $('description').focus();
});
$('copy-image-path').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(state.current.path.slice(7));
    show('Ruta copiada.');
  } catch {
    show('Copia esta ruta: ' + state.current.path.slice(7));
  }
});
