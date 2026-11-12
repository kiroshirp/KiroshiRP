import { state } from './state.js';
import { api } from './api.js';
import { group, nameOf, refresh, renderFiles } from './catalog.js';
import { $, busy, fail, known, labels, setDirty, show } from './dom.js';
import { discardOK } from './session.js';
import { settingsEditor } from './editor.js';
import { renderPreview } from './preview.js';
export async function loadFile(path) {
  if (state.working || !discardOK()) return;
  let published;
  try {
    published = await api('file?path=' + encodeURIComponent(path));
  } catch (error) {
    if (error.status !== 404 || !state.drafts.some((d) => d.path === path)) throw error;
    published = { path, version: '', document: null };
  }
  const draft = state.drafts.find((d) => d.path === path);
  if (draft) {
    const record = await api('draft?path=' + encodeURIComponent(path));
    openEditor({
      ...published,
      content: record.content,
      document: record.document,
      draftRevision: record.revision,
      draftSavedAt: record.savedAt,
      version: record.baseVersion,
      remoteConflict: record.baseVersion !== (published.version || ''),
    });
  } else openEditor(published);
}
export function renderSources() {
  const container = $('source-rows');
  container.replaceChildren();
  (state.extra.sources || []).forEach((source, index) => {
    const row = document.createElement('div');
    row.className = 'source-row';
    for (const [key, labelText] of [
      ['label', 'Nombre de la fuente'],
      ['url', 'Enlace'],
    ]) {
      const label = document.createElement('label');
      label.textContent = labelText;
      const input = document.createElement('input');
      input.type = key === 'url' ? 'url' : 'text';
      input.value = source[key] || '';
      input.addEventListener('input', () => {
        state.extra.sources[index][key] = input.value;
        syncExtra();
        setDirty(true);
      });
      label.append(input);
      row.append(label);
    }
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'small danger';
    remove.textContent = 'Quitar';
    remove.addEventListener('click', () => {
      state.extra.sources.splice(index, 1);
      syncExtra();
      renderSources();
      setDirty(true);
    });
    row.append(remove);
    container.append(row);
  });
}
export function renderRelated() {
  const select = $('related-choice');
  select.replaceChildren();
  for (const file of state.files.filter(
    (f) => f.path.endsWith('.md') && f.path !== state.current?.path,
  )) {
    const option = document.createElement('option');
    option.value = file.path.slice(12, -3);
    option.textContent = nameOf(file);
    select.append(option);
  }
  $('related-list').replaceChildren();
  (state.extra.related || []).forEach((path, index) => {
    const chip = document.createElement('div');
    chip.className = 'related-chip';
    const text = document.createElement('span');
    text.textContent = state.metadataCache.get('src/content/' + path + '.md')?.title || path;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'small';
    remove.textContent = 'Quitar';
    remove.addEventListener('click', () => {
      state.extra.related.splice(index, 1);
      syncExtra();
      renderRelated();
      setDirty(true);
    });
    chip.append(text, remove);
    $('related-list').append(chip);
  });
}
export function syncExtra() {
  state.metadataRaw = false;
  $('metadata').value = JSON.stringify(state.extra, null, 2);
}
export function options() {
  $('order').value = state.extra.order ?? 100;
  $('scope').value = state.extra.universeScope || '';
  $('published').checked = Boolean(state.extra.published);
  $('published-label').hidden = group(state.current.path) !== 'actualizaciones';
  $('faction-label').hidden = group(state.current.path) !== 'facciones';
  $('faction-status').value = state.extra.factionStatus || '';
  $('licensed').checked = Boolean(state.extra.licensedText);
  $('licensed').disabled = Boolean(state.current.document?.metadata?.licensedText);
  $('article-image').replaceChildren(new Option('Sin imagen', ''));
  for (const file of state.files.filter((f) => group(f.path) === 'media'))
    $('article-image').append(new Option(file.path.split('/').pop(), file.path.slice(7)));
  $('article-image').value = state.extra.image?.path || '';
  $('image-alt').value = state.extra.image?.alt || '';
  renderSources();
  renderRelated();
  syncExtra();
}
export function editorTab(preview) {
  $('article-edit').hidden = preview;
  $('article-preview').hidden = !preview;
  document
    .querySelectorAll('[data-editor-tab]')
    .forEach((button) =>
      button.setAttribute(
        'aria-pressed',
        String((button.dataset.editorTab === 'preview') === preview),
      ),
    );
  if (preview) {
    const data = collect();
    renderPreview(
      $('preview-content'),
      data.document.metadata,
      data.document.body,
      'https://kiroshirp.pages.dev/' + state.current.path.slice(12, -3) + '/',
    );
  }
}
export function openEditor(file) {
  state.current = file;
  state.extra = {};
  state.settingsRaw = false;
  state.metadataRaw = false;
  setDirty(false);
  $('editor-error').hidden = true;
  $('welcome').hidden = true;
  $('editor-form').hidden = false;
  $('file-path').textContent = file.path;
  $('file-title').textContent = file.document?.metadata?.title || nameOf(file);
  $('draft-note').hidden = !file.draftRevision;
  $('draft-note').textContent = file.remoteConflict
    ? 'El contenido publicado ha cambiado desde este borrador. Puedes conservarlo en privado, pero debes revisar la versión actual antes de publicar.'
    : file.draftRevision
      ? 'BORRADOR PRIVADO · Guardado el ' +
        new Date(file.draftSavedAt).toLocaleString('es-ES') +
        '. Todavía no cambia la web.'
      : '';
  const article = Boolean(file.document),
    binary = Boolean(file.binary);
  $('kind').textContent = article
    ? 'ARTÍCULO / ' + labels[group(file.path)]
    : binary
      ? 'BIBLIOTECA DE IMÁGENES'
      : 'CONFIGURACIÓN DEL PORTAL';
  $('article-fields').hidden = !article;
  $('json-fields').hidden = article || binary;
  $('image-fields').hidden = !binary;
  $('delete').hidden = !file.version || file.path.startsWith('src/data/');
  $('delete-draft').hidden = !file.draftRevision;
  for (const id of ['save-draft', 'publish', 'validate', 'discard']) $(id).hidden = binary;
  for (const input of $('article-fields').querySelectorAll('input,textarea,select'))
    input.disabled = !article;
  $('settings').disabled = article || binary;
  if (article) {
    for (const key of known)
      $(key).value =
        key === 'updated'
          ? String(file.document.metadata[key] || '').slice(0, 10)
          : file.document.metadata[key] || '';
    $('body').value = file.document.body;
    state.extra = Object.fromEntries(
      Object.entries(file.document.metadata).filter(([key]) => !known.includes(key)),
    );
    options();
    editorTab(false);
    wordCount();
  } else if (binary) {
    const ext = file.path.split('.').pop();
    $('image-preview').src =
      'data:image/' + (ext === 'jpg' ? 'jpeg' : ext) + ';base64,' + file.content;
    $('image-path').textContent = file.path.slice(7);
  } else {
    state.settingsValue = JSON.parse(file.content);
    renderSettings();
  }
  renderFiles();
}
export function renderSettings() {
  state.settingsRaw = false;
  $('settings').value = JSON.stringify(state.settingsValue, null, 2);
  settingsEditor(state.settingsValue, $('settings-form'), () => {
    state.settingsRaw = false;
    $('settings').value = JSON.stringify(state.settingsValue, null, 2);
    setDirty(true);
  });
}
export function collect() {
  if (!state.current) throw new Error('Selecciona un archivo.');
  const data = {
    path: state.current.path,
    version: state.current.version || '',
    ...(state.current.draftRevision ? { draftRevision: state.current.draftRevision } : {}),
  };
  if (state.current.document) {
    if (state.metadataRaw)
      throw new Error('Pulsa «Aplicar opciones avanzadas» antes de guardar o previsualizar.');
    const meta = { ...state.extra };
    for (const key of known) meta[key] = $(key).value;
    meta.order = Number($('order').value || 0);
    meta.licensedText = $('licensed').checked;
    meta.sources = state.extra.sources || [];
    meta.related = state.extra.related || [];
    if ($('scope').value.trim()) meta.universeScope = $('scope').value;
    else delete meta.universeScope;
    if (group(state.current.path) === 'actualizaciones') meta.published = $('published').checked;
    if ($('faction-status').value) meta.factionStatus = $('faction-status').value;
    else delete meta.factionStatus;
    if ($('article-image').value)
      meta.image = { path: $('article-image').value, alt: $('image-alt').value };
    else delete meta.image;
    data.document = { metadata: meta, body: $('body').value };
  } else {
    if (state.settingsRaw) state.settingsValue = JSON.parse($('settings').value);
    data.content = JSON.stringify(state.settingsValue, null, 2) + '\n';
  }
  return data;
}
export function wordCount() {
  const count = $('body').value.trim().split(/\s+/).filter(Boolean).length;
  $('word-count').textContent =
    count + ' palabras · ' + Math.max(1, Math.ceil(count / 220)) + ' min de lectura';
}
export async function saveDraft() {
  if (state.working || !state.current) return;
  busy(true);
  $('editor-error').hidden = true;
  try {
    const data = collect();
    const saved = await api('draft', 'PUT', data);
    state.current.draftRevision = saved.revision;
    state.current.draftSavedAt = saved.savedAt;
    setDirty(false);
    $('draft-note').hidden = false;
    $('draft-note').textContent = 'BORRADOR PRIVADO GUARDADO · La web no se ha modificado.';
    $('delete-draft').hidden = false;
    await refresh();
    show('Borrador guardado en privado. No se ha publicado.');
  } catch (error) {
    fail(error);
  } finally {
    busy(false);
  }
}
