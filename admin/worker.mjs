import { createService } from './service.mjs';
import { githubRepository } from './github.mjs';
import { createAccessService } from './access.mjs';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.protocol !== 'https:') {
      url.protocol = 'https:';
      return Response.redirect(url.toString(), 308);
    }
    if (!env.ADMIN_STATE || !env.GITHUB_TOKEN)
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
    const assets = async (path) => env.ASSETS.fetch(new Request('https://assets.internal' + path));
    const access = createAccessService({ env, store: state.storage, assets });
    const admin = createService({ env, store: state.storage, repo: githubRepository(env), assets });
    this.handle = async (request) => (await access(request)) || admin(request);
  }
  async fetch(request) {
    // Serializar las escrituras evita conflictos entre ediciones y eliminaciones en GitHub.
    return this.state.blockConcurrencyWhile(async () => {
      if (!(await this.state.storage.getAlarm()))
        await this.state.storage.setAlarm(Date.now() + 3600000);
      return this.handle(request);
    });
  }
  async alarm() {
    const records = await this.state.storage.list();
    const expired = [];
    for (const [key, value] of records)
      if (value.expires < Date.now()) {
        await this.state.storage.delete(key);
        if (key.startsWith('access-application:')) {
          await this.state.storage.delete('access-steam:' + value.steamId);
          expired.push(value.discordId);
        }
      }
    if (expired.length) {
      const index = (await this.state.storage.get('access-index')) || [];
      await this.state.storage.put(
        'access-index',
        index.filter((id) => !expired.includes(id)),
      );
    }
    await this.state.storage.setAlarm(Date.now() + 3600000);
  }
}
