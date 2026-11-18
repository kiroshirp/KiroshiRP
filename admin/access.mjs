import { randomBytes, createHash } from 'node:crypto';
import { teamRole, teamSections, validateTeam } from './team-form.mjs';
import { wipeAccount } from './accounts.mjs';
import { adminIds, discordEnabled } from './auth.mjs';
import { createAdminSession } from './api/session.mjs';
import {
  characterSections,
  validateCharacter,
  progress,
  slotOf,
  sheetKey,
  sheetKeys,
  MAX_TOTAL,
  MAX_IMAGES,
} from './character-form.mjs';

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
const pages = {
  '/acceso': '/access.html',
  '/acceso/app.js': '/access.js',
  '/acceso/style.css': '/access.css',
  '/cuenta': '/account.html',
  '/cuenta/personajes': '/account.html',
  '/cuenta/economia': '/account.html',
  '/cuenta/perfil': '/account.html',
  '/cuenta/equipo': '/account.html',
  '/cuenta/app.js': '/account.js',
  '/cuenta/style.css': '/account.css',
};
// Módulos de cada sección de /cuenta/ (JS y CSS propios).
const sectionFile = /^\/cuenta\/(section-[a-z]+\.(?:js|css))$/;
const ACCOUNT_SESSION = 8 * 3600000; // el formulario del equipo es largo: 15 min no bastan
const TEAM_RETENTION = 90 * 86400000;

export function createAccessService({ env, store, assets, fetcher = fetch, local = false }) {
  return async (request) => {
    const url = new URL(request.url),
      path = url.pathname.replace(/\/$/, '');
    if (!/^\/(acceso|cuenta)(\/|$)/.test(path) && path !== '/admin/entrar') return null;
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
    const page = pages[path] || (sectionFile.test(path) && '/' + path.match(sectionFile)[1]);
    if (page) {
      if (request.method !== 'GET') return finish(json({ error: 'Método no permitido.' }, 405));
      return finish(await assets(page));
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
    if (
      (path === '/acceso/login' || path === '/cuenta/login' || path === '/admin/entrar') &&
      request.method === 'GET'
    ) {
      const admin = path === '/admin/entrar';
      if (admin && !discordEnabled(env)) return finish(redirect('/admin/'));
      const state = random();
      await store.put('access-state:' + digest(state), {
        expires: Date.now() + 600000,
        admin,
        account: !admin && (path === '/cuenta/login' || url.searchParams.get('next') === 'cuenta'),
      });
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
      if (pending.admin) {
        // Panel del equipo: solo entran los identificadores de ADMIN_DISCORD_IDS.
        if (!adminIds(env).includes(user.id)) {
          const denied = redirect('/admin/?error=denegado');
          denied.headers.append('Set-Cookie', cookie('krp_oauth', '', 0, local));
          return finish(denied);
        }
        const actor = { id: user.id, name: user.global_name || user.username, method: 'discord' };
        const admin = await createAdminSession({ store, env, local, actor });
        const welcome = redirect('/admin/');
        welcome.headers.append('Set-Cookie', cookie('krp_oauth', '', 0, local));
        welcome.headers.append('Set-Cookie', admin.cookie);
        return finish(welcome);
      }
      const id = random();
      const lifetime = pending.account ? ACCOUNT_SESSION : 900000;
      await store.put('access-session:' + digest(id), {
        discordId: user.id,
        username: user.global_name || user.username,
        expires: Date.now() + lifetime,
      });
      const now = new Date().toISOString();
      const known = await store.get('account:' + user.id);
      await store.put('account:' + user.id, {
        since: known?.since || now,
        name: user.global_name || user.username,
        lastLogin: now,
      });
      const sessionList = (await store.get('account-sessions:' + user.id)) || [];
      await store.put('account-sessions:' + user.id, [...sessionList.slice(-9), digest(id)]);
      const response = redirect(pending.account ? '/cuenta/' : '/acceso/');
      response.headers.append('Set-Cookie', cookie('krp_oauth', '', 0, local));
      response.headers.append('Set-Cookie', cookie('krp_access', id, lifetime / 1000, local));
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
    if (path.startsWith('/cuenta/api/')) {
      const get = request.method === 'GET';
      if (
        !get &&
        (request.headers.get('origin') !== url.origin ||
          !request.headers.get('content-type')?.startsWith('application/json'))
      )
        return finish(json({ error: 'Solicitud no autorizada.' }, 403));
      if (path === '/cuenta/api/form' && get)
        return finish(json({ role: teamRole, sections: teamSections }));
      const mine = valid ? session.discordId : null;
      const current = digest(sessionToken || '');
      // Sesiones vigentes de esta cuenta; descarta de la lista las caducadas.
      const liveSessions = async () => {
        const ids = (await store.get('account-sessions:' + mine)) || [];
        const live = [];
        for (const id of ids)
          if ((await store.get('access-session:' + id))?.expires > Date.now()) live.push(id);
        if (live.length !== ids.length) await store.put('account-sessions:' + mine, live);
        return live;
      };
      const readBody = async (limit) => {
        try {
          const text = await request.text();
          return text.length > limit ? null : JSON.parse(text);
        } catch {
          return null;
        }
      };
      if (path === '/cuenta/api/session' && get) {
        if (!valid) return finish(json({ user: null }));
        const [team, account, sheets, live] = await Promise.all([
          store.get('team-application:' + mine),
          store.get('account:' + mine),
          Promise.all(sheetKeys(mine).map((k) => store.get(k))),
          liveSessions(),
        ]);
        const sheet = sheets[0];
        return finish(
          json({
            user: { id: mine, name: session.username },
            since: account?.since || null,
            expiresAt: session.expires,
            others: live.filter((id) => id !== current).length,
            team: team ? { createdAt: team.createdAt, status: team.status || 'pendiente' } : null,
            character: sheet
              ? { progress: progress(sheet.values), updatedAt: sheet.updatedAt }
              : null,
            characters: sheets.map((s, i) => ({
              slot: i + 1,
              progress: s ? progress(s.values) : null,
              updatedAt: s?.updatedAt || null,
              alias: s?.values?.alias || null,
            })),
          }),
        );
      }
      if (!valid) return finish(json({ error: 'Inicia sesión con Discord.' }, 401));
      if (path === '/cuenta/api/character' && get) {
        const slot = slotOf(url.searchParams.get('slot'));
        if (!slot) return finish(json({ error: 'Personaje no válido.' }, 400));
        const sheet = await store.get(sheetKey(mine, slot));
        return finish(
          json({
            sections: characterSections,
            maxTotal: MAX_TOTAL,
            maxImages: MAX_IMAGES,
            sheet: sheet ? { ...sheet, progress: progress(sheet.values) } : null, // incluye history
          }),
        );
      }
      // Descarga de todos los datos propios (derecho de acceso). No incluye notas internas del equipo.
      if (path === '/cuenta/api/export' && get) {
        const [account, sheets, team, access] = await Promise.all([
          store.get('account:' + mine),
          Promise.all(sheetKeys(mine).map((k) => store.get(k))),
          store.get('team-application:' + mine),
          store.get('access-application:' + mine),
        ]);
        const strip = ({ expires, ...rest }) => rest;
        const response = json({
          exportadoEn: new Date().toISOString(),
          cuenta: { id: mine, ...account },
          fichas: sheets.map((s, i) => (s ? { personaje: i + 1, ...s } : null)).filter(Boolean),
          solicitudEquipo: team ? strip(team) : null,
          solicitudAcceso: access ? strip(access) : null,
        });
        response.headers.set('Content-Disposition', 'attachment; filename="mis-datos-kiroshirp.json"');
        response.headers.set('Cache-Control', 'no-store');
        return finish(response);
      }
      if (get) return finish(json({ error: 'No encontrado.' }, 404));
      const key = 'team-application:' + mine;
      const index = (await store.get('team-index')) || [];
      const clearCookie = (response) => {
        response.headers.append('Set-Cookie', cookie('krp_access', '', 0, local));
        return finish(response);
      };
      if (path === '/cuenta/api/logout') {
        await store.delete('access-session:' + current);
        return clearCookie(json({ ok: true }));
      }
      if (path === '/cuenta/api/sessions-close-others') {
        const others = (await liveSessions()).filter((id) => id !== current);
        for (const id of others) await store.delete('access-session:' + id);
        await store.put('account-sessions:' + mine, [current]);
        return finish(json({ ok: true, closed: others.length }));
      }
      if (path === '/cuenta/api/character') {
        const data = await readBody(70000);
        const { values, images, error } = validateCharacter(data);
        if (error || !data) return finish(json({ error: error || 'Formulario no válido.' }, 400));
        const slot = slotOf(data.slot);
        if (!slot) return finish(json({ error: 'Personaje no válido.' }, 400));
        // Máximo 40 guardados por hora (el autoguardado cuenta).
        const limitKey = 'access-limit:sheet:' + mine;
        const limit = await store.get(limitKey);
        const live = limit?.expires > Date.now();
        if (live && limit.count >= 40)
          return finish(json({ error: 'Demasiados guardados seguidos. Espera unos minutos.' }, 429));
        await store.put(limitKey, {
          count: (live ? limit.count : 0) + 1,
          expires: live ? limit.expires : Date.now() + 3600000,
        });
        const updatedAt = new Date().toISOString();
        // Historial: la versión anterior se conserva si tiene más de 10 minutos de la última guardada (5 como máximo).
        const previous = await store.get(sheetKey(mine, slot));
        let history = previous?.history || [];
        if (
          previous &&
          JSON.stringify(previous.values) !== JSON.stringify(values) &&
          (!history[0] || Date.parse(previous.updatedAt) - Date.parse(history[0].updatedAt) > 600000)
        )
          history = [
            { values: previous.values, images: previous.images, updatedAt: previous.updatedAt },
            ...history,
          ].slice(0, 5);
        await store.put(sheetKey(mine, slot), { values, images, updatedAt, history });
        return finish(json({ ok: true, updatedAt, progress: progress(values) }));
      }
      if (path === '/cuenta/api/character-delete') {
        const slot = slotOf((await readBody(1000))?.slot);
        if (!slot) return finish(json({ error: 'Personaje no válido.' }, 400));
        await store.delete(sheetKey(mine, slot));
        return finish(json({ ok: true }));
      }
      if (path === '/cuenta/api/account-delete') {
        await wipeAccount(store, mine);
        return clearCookie(json({ ok: true }));
      }
      if (path === '/cuenta/api/team-delete') {
        await store.delete(key);
        await store.put(
          'team-index',
          index.filter((id) => id !== session.discordId),
        );
        return finish(json({ ok: true }));
      }
      if (path === '/cuenta/api/team') {
        const data = await readBody(65536);
        const { answers, error } = validateTeam(data);
        if (error || !data) return finish(json({ error: error || 'Formulario no válido.' }, 400));
        if (await store.get(key))
          return finish(
            json({ error: 'Ya has enviado una solicitud. Elimínala si quieres enviar otra.' }, 409),
          );
        const createdAt = new Date().toISOString();
        await store.put(key, {
          discordId: session.discordId,
          discordName: session.username,
          answers,
          createdAt,
          expires: Date.now() + TEAM_RETENTION,
        });
        await store.put('team-index', [session.discordId, ...index]);
        return finish(json({ ok: true, createdAt }));
      }
    }
    if (request.method === 'GET' && path.startsWith('/cuenta/') && !path.startsWith('/cuenta/api/'))
      return finish(redirect('/cuenta'));
    return finish(json({ error: 'No encontrado.' }, 404));
  };
}
