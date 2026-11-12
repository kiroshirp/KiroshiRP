import { state } from './state.js';
import { api } from './api.js';
import { $, fail, labels } from './dom.js';
import { loadFile } from './editor-view.js';
import { normalize } from './editor.js';
export const group = (path) =>
  path.startsWith('public/') ? 'media' : path.includes('/data/') ? 'settings' : path.split('/')[2];
export const nameOf = (file) =>
  state.metadataCache.get(file.path)?.title ||
  {
    'src/data/home.json': 'Portada y plan de apertura',
    'src/data/portal.json': 'Enlaces y parámetros del portal',
    'src/data/legal.json': 'Contacto y avisos',
  }[file.path] ||
  file.path
    .split('/')
    .pop()
    .replace(/\.(md|json)$/, '')
    .replaceAll('-', ' ');
export function overview() {
  const articles = state.files.filter((f) => f.path.endsWith('.md'));
  $('total-articles').textContent = articles.length;
  $('total-drafts').textContent = state.drafts.length;
  $('total-media').textContent = state.files.filter((f) => group(f.path) === 'media').length;
  $('total-review').textContent = articles.filter((f) =>
    ['Borrador', 'Propuesta', 'Por documentar'].includes(state.metadataCache.get(f.path)?.status),
  ).length;
}
export function renderFiles() {
  const query = normalize($('search').value),
    filter = $('filter').value,
    stateFilter = $('state-filter').value;
  const merged = [
    ...state.files,
    ...state.drafts.filter((d) => !state.files.some((f) => f.path === d.path)),
  ];
  const visible = merged.filter((file) => {
    const meta = state.metadataCache.get(file.path) || {};
    const draft = state.drafts.find((d) => d.path === file.path);
    return (
      (!filter || group(file.path) === filter) &&
      (!stateFilter ||
        (stateFilter === 'privado'
          ? draft
          : stateFilter === 'revision'
            ? ['Borrador', 'Propuesta', 'Por documentar'].includes(meta.status)
            : meta.status === stateFilter)) &&
      normalize([nameOf(file), file.path, meta.category, draft?.title].join(' ')).includes(query)
    );
  });
  $('count').textContent = visible.length + (visible.length === 1 ? ' archivo' : ' archivos');
  $('files').replaceChildren();
  for (const file of visible) {
    const button = document.createElement('button');
    button.type = 'button';
    button.classList.toggle('active', file.path === state.current?.path);
    if (file.path === state.current?.path) button.setAttribute('aria-current', 'true');
    const name = document.createElement('strong');
    name.textContent = state.drafts.find((d) => d.path === file.path)?.title || nameOf(file);
    const tag = document.createElement('small');
    tag.textContent =
      labels[group(file.path)] +
      ' · ' +
      (state.drafts.some((d) => d.path === file.path)
        ? 'Borrador privado'
        : state.metadataCache.get(file.path)?.status || 'Archivo');
    button.append(name, tag);
    button.addEventListener('click', async () => {
      try {
        await loadFile(file.path);
        if (state.current?.path === file.path && matchMedia('(max-width:850px)').matches)
          $('editor-form').scrollIntoView({
            behavior: matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth',
            block: 'start',
          });
      } catch (error) {
        fail(error);
      }
    });
    $('files').append(button);
  }
  if (!visible.length) {
    const empty = document.createElement('p');
    empty.textContent = 'No hay contenido que coincida con estos filtros.';
    $('files').append(empty);
  }
  overview();
}
export async function catalog() {
  const generation = ++state.catalogGeneration;
  let offset = 0;
  try {
    do {
      const result = await api('catalog?offset=' + offset);
      if (generation !== state.catalogGeneration) return;
      for (const item of result.items) state.metadataCache.set(item.path, item.metadata);
      renderFiles();
      $('catalog-status').textContent =
        'Leyendo catálogo: ' +
        Math.min(offset + 10, result.total) +
        ' de ' +
        result.total +
        ' artículos';
      offset = result.nextOffset;
    } while (offset !== null);
    $('catalog-status').textContent =
      'Catálogo actualizado. Los borradores privados todavía no modifican la web.';
  } catch (error) {
    if (generation === state.catalogGeneration)
      $('catalog-status').textContent =
        'No se pudo completar el catálogo. Puedes seguir accediendo a los archivos por su nombre.';
  }
}
export async function refresh() {
  const [listing, privateDrafts] = await Promise.all([api('files'), api('drafts')]);
  state.files = listing.files.sort((a, b) => a.path.localeCompare(b.path));
  state.drafts = privateDrafts.drafts;
  renderFiles();
  catalog();
}
export async function publication() {
  try {
    const info = await api('publication');
    $('publication-state').textContent =
      info.mode === 'local'
        ? 'MODO LOCAL · Los archivos no se publican en Internet desde este panel.'
        : info.status === 'completed'
          ? {
              success: 'Cambio recibido en GitHub; comprueba Cloudflare Pages',
              cancelled: 'Publicación de GitHub cancelada',
              failure: 'La publicación de GitHub necesita revisión',
            }[info.conclusion] || 'Publicación de GitHub finalizada'
          : 'Publicación de GitHub en curso. Comprueba Cloudflare Pages después.';
  } catch {
    $('publication-state').textContent =
      'Estado de GitHub no disponible. Consulta Cloudflare Pages.';
  }
}
