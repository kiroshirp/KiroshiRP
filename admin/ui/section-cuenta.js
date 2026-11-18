// Sección «Mi cuenta» de /cuenta/: identidad, sesiones y datos personales (descarga y borrado).
const fmt = (value, options) => {
  const d = new Date(value);
  return isNaN(d) ? '' : d.toLocaleString('es-ES', options);
};

export async function mount(root, { user, api, session, ui }) {
  const { el, toast, reveal, avatar, initialsOf } = ui;
  const stat = (label, value) =>
    el(
      'div',
      { className: 'stat' },
      el('span', { className: 'stat-label', textContent: label }),
      el('span', { className: 'stat-value', textContent: value }),
    );
  const button = (text, cls = '') =>
    el('button', { className: 'btn ' + cls, type: 'button', textContent: text });
  // Desactiva el botón mientras trabaja y avisa si falla.
  const run = (btn, work) => async () => {
    btn.disabled = true;
    try {
      await work();
    } catch (error) {
      toast(error.message, 'error');
    }
    btn.disabled = false;
  };
  const render = () => {
    const others = session.others || 0;
    const logout = button('Cerrar esta sesión');
    const closeOthers = button('Cerrar las otras sesiones');
    closeOthers.disabled = others === 0;
    const download = button('Descargar mis datos');
    const del = button('Eliminar mis datos', 'danger');
    logout.addEventListener(
      'click',
      run(logout, async () => {
        await api('logout', 'POST');
        location.reload();
      }),
    );
    closeOthers.addEventListener(
      'click',
      run(closeOthers, async () => {
        await api('sessions-close-others', 'POST');
        session.others = 0;
        render();
        toast('Otras sesiones cerradas.');
      }),
    );
    download.addEventListener(
      'click',
      run(download, async () => {
        const data = await api('export');
        const link = el('a', { download: 'mis-datos-kiroshirp.json' });
        link.href = URL.createObjectURL(
          new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
        );
        link.click();
        URL.revokeObjectURL(link.href);
        toast('Descarga lista.');
      }),
    );
    del.addEventListener(
      'click',
      run(del, async () => {
        if (
          !confirm(
            'Se borrarán tu ficha de personaje, tu solicitud al equipo y todas tus sesiones. Esta acción no se puede deshacer. ¿Continuar?',
          )
        )
          return;
        await api('account-delete', 'POST');
        location.reload();
      }),
    );
    const grid = el(
      'div',
      { className: 'card-grid' },
      el(
        'div',
        { className: 'card' },
        el(
          'div',
          { className: 'id-head' },
          avatar(initialsOf(user.name)),
          el('h2', { textContent: 'Identidad de la cuenta' }),
        ),
        el(
          'div',
          { className: 'stats' },
          stat('Usuario', user.name),
          stat('Miembro desde', session.since ? fmt(session.since, { dateStyle: 'long' }) : '—'),
          stat('Discord', 'Vinculado'),
          stat('Vínculo con el juego', 'Todavía no disponible'),
        ),
      ),
      el(
        'div',
        { className: 'card' },
        el('h2', { textContent: 'Sesiones de la web' }),
        el(
          'p',
          {},
          'Esta sesión · ' +
            (session.expiresAt
              ? 'Caduca el ' + fmt(session.expiresAt, { dateStyle: 'long', timeStyle: 'short' }) + ' · '
              : ''),
          el('span', { className: 'badge pulse', textContent: 'ACTUAL' }),
        ),
        el('p', {
          className: 'hint',
          textContent: others
            ? 'Otras sesiones abiertas: ' + others + '.'
            : 'No hay otras sesiones abiertas.',
        }),
        el('div', { className: 'actions' }, logout, closeOthers),
      ),
      el(
        'div',
        { className: 'card' },
        el('h2', { textContent: 'Tus datos' }),
        el('p', {
          className: 'hint',
          textContent:
            'Descarga una copia de todo lo que guardamos de ti, o bórralo: ficha, solicitud y sesiones.',
        }),
        el('div', { className: 'actions' }, download, del),
      ),
    );
    root.replaceChildren(
      el(
        'div',
        { className: 'view-head' },
        el('p', { className: 'eyebrow', textContent: 'IDENTIDAD Y SEGURIDAD' }),
        el('h1', { textContent: 'Tu cuenta.' }),
        el('p', {
          className: 'lead',
          textContent: 'Controla tu acceso a la web desde un mismo lugar.',
        }),
      ),
      grid,
    );
    reveal([...grid.children]);
  };
  render();
}
