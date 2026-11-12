// Punto de entrada del panel: reparte cada petición a su módulo en admin/api/.
import { editorialOperation } from './editorial.mjs';
import { STATIC_ROUTES } from './config.mjs';
import { json, finish, equal, readJson } from './http.mjs';
import { findSession, login, logout } from './api/session.mjs';
import { solicitudes } from './api/solicitudes.mjs';
import { files } from './api/files.mjs';

const METHODS = ['GET', 'POST', 'PUT', 'DELETE'];

function genericError(error) {
  return (
    error.publicMessage ||
    (error.name === 'ZodError'
      ? 'Datos no válidos: ' +
        error.issues.map((i) => i.path.join('.') + ': ' + i.message).join('; ')
      : error.safe
        ? error.message
        : 'No se pudo completar la operación. Comprueba el contenido y la conexión del servicio.')
  );
}

export function createService({ env, store, repo, assets, local = false }) {
  return async function handle(request) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, '');
    try {
      if (!METHODS.includes(request.method))
        return finish(json({ error: 'Método no permitido.' }, 405));
      if (!path.startsWith('/admin'))
        return finish(new Response(null, { status: 302, headers: { Location: '/admin/' } }));

      if (!path.startsWith('/admin/api/')) {
        const asset = STATIC_ROUTES.get(path);
        if (!asset) return finish(json({ error: 'No encontrado.' }, 404));
        return finish(await assets(asset));
      }

      if (!env.ADMIN_USERNAME?.trim() || (env.ADMIN_PASSWORD?.length || 0) < 13)
        return finish(
          json(
            {
              error:
                'Administrador pendiente de configurar: completa el .env privado y usa una contraseña de al menos 13 caracteres.',
            },
            503,
          ),
        );

      const mutating = request.method !== 'GET';
      if (
        mutating &&
        (request.headers.get('origin') !== url.origin ||
          !request.headers.get('content-type')?.startsWith('application/json'))
      )
        return finish(json({ error: 'Solicitud de otro origen o formato no permitido.' }, 403));

      const { cookie, session, credentialsVersion, valid } = await findSession({
        request,
        env,
        store,
        local,
      });
      let data = {};
      if (mutating) {
        const body = await readJson(request);
        if (body.response) return finish(body.response);
        data = body.data;
      }

      if (path === '/admin/api/login' && request.method === 'POST')
        return finish(
          await login({ request, data, env, store, local, cookie, credentialsVersion }),
        );
      if (!valid) return finish(json({ error: 'Inicia sesión para acceder.' }, 401));
      if (mutating && !equal(request.headers.get('x-csrf-token') || '', session.csrf))
        return finish(json({ error: 'La sesión no autoriza esta solicitud.' }, 403));

      if (path === '/admin/api/solicitudes')
        return finish(await solicitudes({ request, data, store }));

      const editorial = await editorialOperation({
        route: path,
        url,
        method: request.method,
        data,
        repo,
        store,
      });
      if (editorial !== null) return finish(json(editorial));

      const get = request.method === 'GET';
      if (path === '/admin/api/logout' && request.method === 'POST')
        return finish(await logout({ store, local, cookie }));
      if (path === '/admin/api/session' && get)
        return finish(json({ csrf: session.csrf, mode: local ? 'local' : 'github' }));
      if (path === '/admin/api/publication' && get)
        return finish(json(local ? { mode: 'local' } : await repo.publication()));
      if (path === '/admin/api/files' && get) return finish(json({ files: await repo.list() }));
      if (path === '/admin/api/file')
        return finish(await files({ request, url, data, repo, store }));
      return finish(json({ error: 'No encontrado.' }, 404));
    } catch (error) {
      return finish(json({ error: genericError(error) }, error.status || 400));
    }
  };
}
