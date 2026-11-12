import { randomBytes, createHash } from 'node:crypto';

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
const random = () => randomBytes(32).toString('hex');
const digest = (value) => createHash('sha256').update(value).digest('hex');
const cookie = (name, value, maxAge, local) =>
  `${local ? '' : '__Host-'}${name}=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${local ? '' : '; Secure'}`;
const getCookie = (request, name) =>
  request.headers
    .get('cookie')
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(name + '='))
    ?.slice(name.length + 1);
const redirect = (path) => new Response(null, { status: 302, headers: { Location: path } });
const required = [
  'DISCORD_CLIENT_ID',
  'DISCORD_CLIENT_SECRET',
  'DISCORD_BOT_TOKEN',
  'DISCORD_INVITE_CHANNEL_ID',
];
const steamId = (value) => typeof value === 'string' && /^7656119\d{10}$/.test(value);

export function createAccessService({ env, store, assets, fetcher = fetch, local = false }) {
  return async (request) => {
    const url = new URL(request.url),
      path = url.pathname.replace(/\/$/, '');
    if (path !== '/acceso' && !path.startsWith('/acceso/')) return null;
    const finish = (response) => {
      const headers = new Headers(response.headers);
      headers.set('Cache-Control', 'no-store');
      headers.set('X-Robots-Tag', 'noindex, nofollow');
      headers.set('X-Content-Type-Options', 'nosniff');
      headers.set('Referrer-Policy', 'no-referrer');
      headers.set('X-Frame-Options', 'DENY');
      headers.set(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
      );
      return new Response(response.body, { status: response.status, headers });
    };
    if (request.method !== 'GET' && request.method !== 'POST')
      return finish(json({ error: 'Método no permitido.' }, 405));
    if (path === '/acceso' || path === '/acceso/app.js' || path === '/acceso/style.css') {
      if (request.method !== 'GET') return finish(json({ error: 'Método no permitido.' }, 405));
      return finish(
        await assets(
          path === '/acceso'
            ? '/access.html'
            : path === '/acceso/app.js'
              ? '/access.js'
              : '/access.css',
        ),
      );
    }
    if (required.some((key) => !env[key]))
      return finish(json({ error: 'El acceso todavía no está configurado.' }, 503));
    const sessionName = local ? 'krp_access' : '__Host-krp_access';
    const stateName = local ? 'krp_oauth' : '__Host-krp_oauth';
    const sessionToken = getCookie(request, sessionName);
    const session = /^[a-f0-9]{64}$/.test(sessionToken || '')
      ? await store.get('access-session:' + digest(sessionToken))
      : null;
    const valid = session?.expires > Date.now();
    if (path === '/acceso/login' && request.method === 'GET') {
      const state = random();
      await store.put('access-state:' + digest(state), { expires: Date.now() + 600000 });
      const redirectUri = url.origin + '/acceso/callback';
      const auth = new URL('https://discord.com/oauth2/authorize');
      auth.search = new URLSearchParams({
        client_id: env.DISCORD_CLIENT_ID,
        response_type: 'code',
        redirect_uri: redirectUri,
        scope: 'identify',
        state,
      }).toString();
      const response = redirect(auth.toString());
      response.headers.set('Set-Cookie', cookie('krp_oauth', state, 600, local));
      return finish(response);
    }
    if (path === '/acceso/callback' && request.method === 'GET') {
      const state = url.searchParams.get('state') || '',
        old = getCookie(request, stateName) || '';
      const pending =
        /^[a-f0-9]{64}$/.test(state) && state === old
          ? await store.get('access-state:' + digest(state))
          : null;
      if (!pending || pending.expires < Date.now() || !url.searchParams.get('code'))
        return finish(
          json(
            {
              error:
                'No se pudo completar el inicio de sesión. Vuelve al formulario e inténtalo otra vez.',
            },
            400,
          ),
        );
      await store.delete('access-state:' + digest(state));
      const tokenResponse = await fetcher('https://discord.com/api/v10/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: env.DISCORD_CLIENT_ID,
          client_secret: env.DISCORD_CLIENT_SECRET,
          grant_type: 'authorization_code',
          code: url.searchParams.get('code'),
          redirect_uri: url.origin + '/acceso/callback',
        }),
      });
      if (!tokenResponse.ok)
        return finish(
          json({ error: 'Discord no ha completado el acceso. Inténtalo de nuevo.' }, 502),
        );
      const tokens = await tokenResponse.json();
      const userResponse = await fetcher('https://discord.com/api/v10/users/@me', {
        headers: { Authorization: 'Bearer ' + tokens.access_token },
      });
      if (!userResponse.ok)
        return finish(json({ error: 'No se pudo consultar la cuenta de Discord.' }, 502));
      const user = await userResponse.json();
      if (!/^\d{17,20}$/.test(user.id || ''))
        return finish(json({ error: 'Discord devolvió una identidad no válida.' }, 502));
      const id = random();
      await store.put('access-session:' + digest(id), {
        discordId: user.id,
        username: user.global_name || user.username,
        expires: Date.now() + 900000,
      });
      const response = redirect('/acceso/');
      response.headers.append('Set-Cookie', cookie('krp_oauth', '', 0, local));
      response.headers.append('Set-Cookie', cookie('krp_access', id, 900, local));
      return finish(response);
    }
    if (path === '/acceso/api/session' && request.method === 'GET')
      return finish(
        json(
          valid
            ? {
                user: { id: session.discordId, name: session.username },
                invite: session.invite || null,
                registered: Boolean(await store.get('access-application:' + session.discordId)),
              }
            : { user: null, invite: null, registered: false },
        ),
      );
    if (path === '/acceso/api/delete' && request.method === 'POST') {
      if (!valid) return finish(json({ error: 'Inicia sesión con Discord.' }, 401));
      if (
        request.headers.get('origin') !== url.origin ||
        !request.headers.get('content-type')?.startsWith('application/json')
      )
        return finish(json({ error: 'Solicitud no autorizada.' }, 403));
      const record = await store.get('access-application:' + session.discordId);
      if (record) {
        await store.delete('access-application:' + session.discordId);
        await store.delete('access-steam:' + record.steamId);
        const index = (await store.get('access-index')) || [];
        await store.put(
          'access-index',
          index.filter((id) => id !== session.discordId),
        );
      }
      session.invite = null;
      await store.put('access-session:' + digest(sessionToken), session);
      return finish(json({ ok: true }));
    }
    if (path === '/acceso/api/submit' && request.method === 'POST') {
      if (!valid) return finish(json({ error: 'Inicia sesión con Discord.' }, 401));
      if (
        request.headers.get('origin') !== url.origin ||
        !request.headers.get('content-type')?.startsWith('application/json')
      )
        return finish(json({ error: 'Solicitud no autorizada.' }, 403));
      if (Number(request.headers.get('content-length')) > 1024)
        return finish(json({ error: 'Solicitud demasiado grande.' }, 413));
      let data;
      try {
        const body = await request.text();
        if (body.length > 1024) return finish(json({ error: 'Solicitud demasiado grande.' }, 413));
        data = JSON.parse(body);
      } catch {
        return finish(json({ error: 'Formulario no válido.' }, 400));
      }
      const ip = request.headers.get('cf-connecting-ip') || 'local';
      const limitKey = 'access-limit:' + digest(ip);
      const limit = await store.get(limitKey);
      if (limit?.expires > Date.now() && limit.count >= 5)
        return finish(json({ error: 'Demasiados intentos. Espera unos minutos.' }, 429));
      await store.put(limitKey, {
        count: (limit?.expires > Date.now() ? limit.count : 0) + 1,
        expires: Date.now() + 900000,
      });
      if (!steamId(data?.steamId))
        return finish(json({ error: 'Introduce un SteamID64 de 17 cifras.' }, 400));
      if (data.consent !== true)
        return finish(json({ error: 'Confirma que has leído la información de privacidad.' }, 400));
      const existing = await store.get('access-application:' + session.discordId);
      if (existing && existing.steamId !== data.steamId)
        return finish(
          json(
            {
              error:
                'Esta cuenta de Discord ya tiene una solicitud con otro SteamID. Contacta con el equipo.',
            },
            409,
          ),
        );
      const owner = await store.get('access-steam:' + data.steamId);
      if (owner && owner !== session.discordId)
        return finish(json({ error: 'Ese SteamID ya figura en otra solicitud.' }, 409));
      const inviteResponse = await fetcher(
        `https://discord.com/api/v10/channels/${env.DISCORD_INVITE_CHANNEL_ID}/invites`,
        {
          method: 'POST',
          headers: {
            Authorization: 'Bot ' + env.DISCORD_BOT_TOKEN,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            max_age: 900,
            max_uses: 1,
            unique: true,
            target_user_ids: [session.discordId],
          }),
        },
      );
      if (!inviteResponse.ok)
        return finish(json({ error: 'No se pudo crear la invitación. Inténtalo más tarde.' }, 502));
      const invite = await inviteResponse.json();
      if (!/^[\w-]+$/.test(invite.code || ''))
        return finish(json({ error: 'Discord devolvió una invitación no válida.' }, 502));
      if (!existing) {
        const now = new Date().toISOString();
        const record = {
          discordId: session.discordId,
          discordName: session.username,
          steamId: data.steamId,
          createdAt: now,
          consentAt: now,
          result: 'Invitación emitida',
          expires: Date.now() + 90 * 86400000,
        };
        await store.put('access-application:' + session.discordId, record);
        await store.put('access-steam:' + data.steamId, session.discordId);
        const index = (await store.get('access-index')) || [];
        index.unshift(session.discordId);
        await store.put('access-index', index);
      }
      session.invite = 'https://discord.gg/' + invite.code;
      await store.put('access-session:' + digest(sessionToken), session);
      return finish(json({ invite: session.invite }));
    }
    return finish(json({ error: 'No encontrado.' }, 404));
  };
}
