import { createService } from './service.mjs';
import { createAccessService } from './access.mjs';
import { tursoStore } from './turso-store.mjs';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.protocol !== 'https:') {
      url.protocol = 'https:';
      return Response.redirect(url.toString(), 308);
    }
    if (!env.ADMIN_STATE)
      return new Response('Administrador pendiente de configurar.', {
        status: 503,
        headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
      });
    const response = await env.ADMIN_STATE.get(env.ADMIN_STATE.idFromName('portal')).fetch(request);
    const headers = new Headers(response.headers);
    headers.set('Strict-Transport-Security', 'max-age=31536000');
    return new Response(response.body, { status: response.status, headers });
  },
};
export class AdminState {
  constructor(state, env) {
    this.state = state;
    // Con Turso configurado los datos viven allí; el Durable Object solo serializa las peticiones y programa la limpieza.
    this.store =
      env.TURSO_DATABASE_URL && env.TURSO_AUTH_TOKEN
        ? tursoStore({ url: env.TURSO_DATABASE_URL, token: env.TURSO_AUTH_TOKEN })
        : state.storage;
    const assets = async (path) => env.ASSETS.fetch(new Request('https://assets.internal' + path));
    const access = createAccessService({ env, store: this.store, assets });
    const admin = createService({ env, store: this.store, assets });
    this.handle = async (request) => (await access(request)) || admin(request);
  }
  // Copia a Turso lo que quedó en el Durable Object y solo entonces lo borra; si falla, se reintenta.
  async migrate() {
    if (this.store === this.state.storage || (await this.state.storage.get('moved-to-turso')))
      return;
    await this.store.putMany(await this.state.storage.list());
    await this.state.storage.deleteAll();
    await this.state.storage.put('moved-to-turso', true);
  }
  async fetch(request) {
    // Serializar las escrituras evita conflictos entre peticiones simultáneas.
    return this.state.blockConcurrencyWhile(async () => {
      try {
        if (!(await this.state.storage.getAlarm()))
          await this.state.storage.setAlarm(Date.now() + 3600000);
        await this.migrate();
        return await this.handle(request);
      } catch (error) {
        console.error('Almacenamiento no disponible:', error.message);
        return new Response(
          JSON.stringify({
            error: 'Almacenamiento no disponible. Inténtalo de nuevo en un momento.',
          }),
          {
            status: 503,
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              'Cache-Control': 'no-store',
            },
          },
        );
      }
    });
  }
  async alarm() {
    try {
      await this.migrate();
      const records = await this.store.list({ prefix: '' });
      const expired = [];
      for (const [key, value] of records)
        if (value.expires < Date.now()) {
          await this.store.delete(key);
          if (key.startsWith('access-application:')) {
            await this.store.delete('access-steam:' + value.steamId);
            expired.push(value.discordId);
          }
        }
      if (expired.length) {
        const index = (await this.store.get('access-index')) || [];
        await this.store.put(
          'access-index',
          index.filter((id) => !expired.includes(id)),
        );
      }
    } catch (error) {
      console.error('Limpieza de caducados fallida:', error.message);
    }
    // Pase lo que pase, la limpieza se vuelve a programar.
    await this.state.storage.setAlarm(Date.now() + 3600000);
  }
}
