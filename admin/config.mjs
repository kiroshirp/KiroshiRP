// Constantes del panel.
export const MAX_AGE = 7200;
// Archivos estáticos que el panel sirve, con el nombre del recurso interno.
export const STATIC_ROUTES = new Map([
  ['/admin', '/index.html'],
  ['/admin/solicitudes', '/solicitudes.html'],
  ['/admin/equipo', '/equipo.html'],
  ...[
    'panel.js',
    'usuarios.js',
    'solicitudes.js',
    'equipo.js',
    'style.css',
    'brand.webp',
    'favicon.png',
  ].map((f) => ['/admin/' + f, '/' + f]),
]);
