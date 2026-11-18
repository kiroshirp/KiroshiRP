// Constantes del panel.
export const MAX_AGE = 7200;
const faces = [
  'inter-latin-400-normal.woff2',
  'inter-latin-600-normal.woff2',
  'inter-latin-800-normal.woff2',
  'rajdhani-latin-500-normal.woff2',
  'rajdhani-latin-700-normal.woff2',
  'share-tech-mono-latin-400-normal.woff2',
];
// Archivos estáticos que el panel sirve, con el nombre del recurso interno.
export const STATIC_ROUTES = new Map([
  ['/admin', '/index.html'],
  ['/admin/solicitudes', '/solicitudes.html'],
  ['/admin/equipo', '/equipo.html'],
  ['/admin/registro', '/registro.html'],
  ['/admin/fonts.css', '/fonts.css'],
  ...faces.map((f) => ['/admin/fonts/' + f, '/fonts/' + f]),
  ...[
    'panel.js',
    'usuarios.js',
    'solicitudes.js',
    'equipo.js',
    'registro.js',
    'style.css',
    'brand.webp',
    'favicon.png',
  ].map((f) => ['/admin/' + f, '/' + f]),
]);
