// Cifras agregadas para el panel: altas por día, embudo de cuentas y candidaturas pendientes.
import { json } from '../http.mjs';
import { progress, sheetKeys } from '../character-form.mjs';

export async function estadisticas({ request, store }) {
  const ids = (await store.get('team-index')) || [];
  const pendientes = async () => {
    let n = 0;
    for (const id of ids) {
      const r = await store.get('team-application:' + id);
      if (r && (r.status || 'pendiente') === 'pendiente') n++;
    }
    return n;
  };
  if (new URL(request.url).searchParams.get('solo') === 'pendientes')
    return json({ pendientes: await pendientes() });

  const perDay = new Map();
  const funnel = { discord: 0, ficha: 0, solicitud: 0, aceptada: 0 };
  for (const [key, account] of await store.list({ prefix: 'account:' })) {
    const id = key.slice('account:'.length);
    funnel.discord++;
    const day = (account.since || '').slice(0, 10);
    perDay.set(day, (perDay.get(day) || 0) + 1);
    const [sheet, team] = await Promise.all([
      store.get(sheetKeys(id)[0]),
      store.get('team-application:' + id),
    ]);
    if (sheet && progress(sheet.values) >= 50) funnel.ficha++;
    if (team) funnel.solicitud++;
    if (team?.status === 'aceptada') funnel.aceptada++;
  }
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    days.push({ date, count: perDay.get(date) || 0 });
  }
  return json({ days, funnel, pendientes: await pendientes() });
}
