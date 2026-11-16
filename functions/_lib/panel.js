// Reenvía las rutas privadas al Worker del panel (enlace PANEL) para que vivan en el dominio de la web.
// El Worker ve la dirección original, así que cookies, orígenes y la redirección de Discord coinciden.
// Sin el enlace (vista previa o aún sin configurar) redirige a la dirección directa del Worker.
const DIRECT = 'https://kiroshirp-admin.kiroshirp.workers.dev';

export const forward = ({ request, env }) => {
  if (env.PANEL) return env.PANEL.fetch(request);
  const url = new URL(request.url);
  return Response.redirect(DIRECT + url.pathname + url.search, 302);
};
