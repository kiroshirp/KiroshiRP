const $ = (id) => document.getElementById(id);
async function load() {
  try {
    const response = await fetch('/acceso/api/session', { credentials: 'same-origin' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No se pudo comprobar el acceso.');
    $('loading').hidden = true;
    if (!data.user) {
      $('start').hidden = false;
      return;
    }
    $('discord-name').textContent = data.user.name;
    $('discord-id').textContent = 'ID: ' + data.user.id;
    $('delete-request').hidden = !data.registered;
    if (data.invite) {
      $('invite').href = data.invite;
      $('success').hidden = false;
      return;
    }
    $('form-step').hidden = false;
  } catch (error) {
    $('loading').hidden = true;
    $('error').textContent = error.message;
    $('error').hidden = false;
  }
}
$('access-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = $('access-form').querySelector('button');
  button.disabled = true;
  $('error').hidden = true;
  $('notice').hidden = true;
  try {
    const response = await fetch('/acceso/api/submit', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        steamId: $('steam-id').value.trim(),
        consent: $('privacy-consent').checked,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No se pudo completar el acceso.');
    $('form-step').hidden = true;
    $('invite').href = data.invite;
    $('success').hidden = false;
  } catch (error) {
    $('error').textContent = error.message;
    $('error').hidden = false;
  } finally {
    button.disabled = false;
  }
});
$('delete-request').addEventListener('click', async () => {
  if (!confirm('¿Eliminar tu solicitud de acceso y los identificadores guardados?')) return;
  try {
    const response = await fetch('/acceso/api/delete', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No se pudo eliminar la solicitud.');
    $('delete-request').hidden = true;
    $('success').hidden = true;
    $('form-step').hidden = false;
    $('notice').textContent = 'Solicitud eliminada. Puedes cerrar esta página.';
    $('notice').hidden = false;
  } catch (error) {
    $('error').textContent = error.message;
    $('error').hidden = false;
  }
});
load();
