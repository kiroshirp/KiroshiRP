// Constantes del panel.
export const MAX_AGE = 7200;
// Archivos estáticos que el panel sirve, con el nombre del recurso interno.
export const STATIC_ROUTES = new Map([
  ['/admin', '/index.html'],
  ['/admin/solicitudes', '/solicitudes.html'],
  ...[
    'main.js',
    'state.js',
    'dom.js',
    'api.js',
    'catalog.js',
    'session.js',
    'editor-view.js',
    'events-session.js',
    'events-editor.js',
    'events-media.js',
    'events-global.js',
    'editor.js',
    'preview.js',
    'style.css',
    'brand.webp',
    'city.webp',
    'favicon.png',
    'solicitudes.js',
  ].map((f) => ['/admin/' + f, '/' + f]),
]);
