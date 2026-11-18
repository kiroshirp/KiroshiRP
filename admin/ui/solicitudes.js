import { api, el, fmtDate, start, delButton } from './panel.js';
const status = document.getElementById('status'),
  rows = document.getElementById('rows');
async function load() {
  try {
    const { items } = await api('solicitudes');
    rows.replaceChildren(
      ...items.map((i) => {
        const td = el('td');
        td.append(
          delButton(
            'Eliminar',
            '¿Eliminar esta solicitud y permitir un nuevo registro?',
            async () => {
              try {
                await api('solicitudes', 'DELETE', { discordId: i.discordId });
                await load();
              } catch (e) {
                status.textContent = e.message;
              }
            },
          ),
        );
        const tr = el('tr');
        tr.append(
          el('td', `${i.discordName} (${i.discordId})`),
          el('td', i.steamId),
          el('td', fmtDate(i.createdAt)),
          el('td', i.result),
          td,
        );
        return tr;
      }),
    );
    status.textContent = items.length
      ? `${items.length} solicitudes registradas.`
      : 'Aún no hay solicitudes. Aparecen cuando alguien pide su invitación desde la página de acceso.';
  } catch (e) {
    status.textContent = e.message;
  }
}
start(load);
