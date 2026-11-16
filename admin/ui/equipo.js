export {};
const status = document.getElementById('status'),
  list = document.getElementById('list');
let csrf = '';
async function api(path, method = 'GET', body) {
  const response = await fetch('/admin/api/' + path, {
    method,
    credentials: 'same-origin',
    headers: method === 'GET' ? {} : { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  if (response.status === 401) {
    location.href = '/admin/';
    return null;
  }
  if (!response.ok) throw new Error(data.error || 'No se pudo consultar las solicitudes.');
  return data;
}
// Las claves de respuesta son los ids de campo; se muestran tal cual, solo legibles.
function label(key) {
  const text = key.replace(/[_-]+/g, ' ').trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}
async function load() {
  try {
    csrf = (await api('session'))?.csrf || '';
    if (!csrf) return;
    const data = await api('equipo');
    if (!data) return;
    list.replaceChildren();
    for (const item of data.items) {
      const details = document.createElement('details'),
        summary = document.createElement('summary'),
        dl = document.createElement('dl');
      summary.textContent =
        item.discordName +
        ' (' +
        item.discordId +
        ') · ' +
        new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(
          new Date(item.createdAt),
        );
      for (const [key, answer] of Object.entries(item.answers || {})) {
        const dt = document.createElement('dt'),
          dd = document.createElement('dd');
        dt.textContent = data.labels?.[key] || label(key);
        dd.textContent = String(answer ?? '');
        dl.append(dt, dd);
      }
      const button = document.createElement('button');
      button.textContent = 'Eliminar';
      button.type = 'button';
      button.className = 'small danger';
      button.addEventListener('click', async () => {
        if (!confirm('¿Eliminar esta solicitud del equipo?')) return;
        try {
          await api('equipo', 'DELETE', { discordId: item.discordId });
          await load();
        } catch (error) {
          status.textContent = error.message;
        }
      });
      details.append(summary, dl, button);
      list.append(details);
    }
    status.textContent = data.items.length
      ? `${data.items.length} solicitudes del equipo.`
      : 'Todavía no hay solicitudes del equipo.';
  } catch (error) {
    status.textContent = error.message;
  }
}
load();
