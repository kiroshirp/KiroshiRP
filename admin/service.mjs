// Punto de entrada del panel: reparte cada petición a su módulo en admin/api/.
import { STATIC_ROUTES } from './config.mjs';
import { json, finish, equal, readJson } from './http.mjs';
import { findSession, login, logout } from './api/session.mjs';
import { solicitudes } from './api/solicitudes.mjs';
import { equipo } from './api/equipo.mjs';
import { usuarios } from './api/usuarios.mjs';
import { registro } from './api/registro.mjs';
import { authMethods } from './auth.mjs';

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

export function createService({ env, store, assets, local = false }) {
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

      const methods = authMethods(env);
      if (path === '/admin/api/auth' && request.method === 'GET') return finish(json(methods));
      if (!methods.password && !methods.discord)
        return finish(
          json(
            {
              error:
                'Administrador pendiente de configurar: define ADMIN_DISCORD_IDS o un usuario y una contraseña de al menos 13 caracteres en el .env privado.',
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

      const { cookie, session, valid } = await findSession({
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
          methods.password
            ? await login({ request, data, env, store, local, cookie })
            : json({ error: 'El acceso con contraseña está desactivado.' }, 403),
        );
      if (!valid) return finish(json({ error: 'Inicia sesión para acceder.' }, 401));
      if (mutating && !equal(request.headers.get('x-csrf-token') || '', session.csrf))
        return finish(json({ error: 'La sesión no autoriza esta solicitud.' }, 403));

      // Quién actúa, para el registro. Las sesiones anteriores al registro eran de contraseña.
      const actor = session.actor || {
        id: 'password',
        name: env.ADMIN_USERNAME,
        method: 'password',
      };
      if (path === '/admin/api/solicitudes')
        return finish(await solicitudes({ request, data, store, actor }));
      if (path === '/admin/api/equipo')
        return finish(await equipo({ request, data, store, actor }));
      if (path === '/admin/api/usuarios')
        return finish(await usuarios({ request, data, store, actor }));
      if (path === '/admin/api/registro' && request.method === 'GET')
        return finish(await registro({ store }));

      const get = request.method === 'GET';
      if (path === '/admin/api/logout' && request.method === 'POST')
        return finish(await logout({ store, local, cookie }));
      if (path === '/admin/api/session' && get)
        return finish(
          json({ csrf: session.csrf, actor: { name: actor.name, method: actor.method } }),
        );
      return finish(json({ error: 'No encontrado.' }, 404));
    } catch (error) {
      return finish(json({ error: genericError(error) }, error.status || 400));
    }
  };
}
