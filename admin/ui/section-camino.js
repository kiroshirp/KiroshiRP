// «Tu camino» de la Vista general: de entrar con Discord a ser aceptado, con el siguiente paso a un clic.
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

export function buildCamino({ session, paths }) {
  const ficha = session.character ? Math.round(session.character.progress) : 0;
  const status = session.team?.status;
  const steps = [
    { title: 'Entrar con Discord', done: true, note: 'Cuenta vinculada.' },
    {
      title: 'Cuenta tu historia',
      done: ficha >= 50,
      note: ficha ? `Ficha al ${ficha}%.` : 'Empieza tu ficha de personaje.',
      href: paths.personajes,
      cta: ficha ? 'Seguir con la ficha' : 'Empezar la ficha',
    },
    {
      title: 'Solicitud al equipo',
      done: Boolean(session.team),
      note: session.team ? 'Solicitud enviada.' : 'Opcional: únete al equipo.',
      href: paths.equipo,
      cta: 'Enviar solicitud',
    },
    {
      title: 'Aprobado',
      done: status === 'aceptada',
      note:
        status === 'aceptada'
          ? 'Solicitud aceptada.'
          : status === 'rechazada'
            ? 'No aceptada esta vez.'
            : status
              ? 'En revisión.'
              : 'Cuando el equipo la revise.',
    },
  ];
  const next = steps.findIndex((s) => !s.done);
  const box = el('section', 'card camino');
  box.setAttribute('aria-label', 'Tu camino');
  box.append(el('h2', null, 'Tu camino'));
  const list = el('ol', 'camino-steps');
  steps.forEach((s, i) => {
    const li = el('li', 'camino-step' + (s.done ? ' done' : i === next ? ' now' : ''));
    if (i === next) li.setAttribute('aria-current', 'step');
    li.append(
      el('span', 'camino-dot', s.done ? '✓' : String(i + 1)),
      el('strong', null, s.title),
      el('small', null, s.note),
    );
    list.append(li);
  });
  box.append(list);
  const step = steps[next];
  if (step?.href) {
    const a = el('a', 'btn primary', step.cta + ' →');
    a.href = step.href;
    box.append(a);
  }
  return box;
}
