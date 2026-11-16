// Formulario «Únete al equipo»: una sola definición para pintar el formulario y validar el envío.
const yn = ['Sí', 'No'];
const text = (id, label, required = true) => ({ id, label, type: 'text', required, max: 200 });
const long = (id, label, required = true) => ({ id, label, type: 'long', required, max: 1500 });
const pick = (id, label, required = true) => ({ id, label, type: 'select', required, options: yn });

export const teamRole = {
  title: 'Equipo de Soporte',
  summary:
    'Buscamos personas comprometidas, responsables y con ganas de ayudar a los jugadores, resolver dudas y mantener un buen ambiente. Formar parte del equipo de soporte no significa tener privilegios sobre otros jugadores.',
};

export const teamSections = [
  {
    title: 'Información personal',
    fields: [
      text('nombre', '¿Cuál es tu nombre o apodo?'),
      { id: 'edad', label: '¿Cuántos años tienes?', type: 'number', required: true },
      text('discord', '¿Cuál es tu usuario de Discord?'),
      text('pais', '¿De qué país eres y cuál es tu zona horaria?'),
      text('horas', '¿Cuántas horas al día podrías dedicar al equipo?'),
      text('horario', '¿En qué horario sueles estar disponible?'),
    ],
  },
  {
    title: 'Experiencia',
    fields: [
      pick(
        'staffPrevio',
        '¿Has formado parte anteriormente del staff de algún servidor de roleplay?',
      ),
      long('funciones', '¿Qué funciones desempeñabas y durante cuánto tiempo?', false),
      pick('tickets', '¿Tienes experiencia utilizando sistemas de tickets de Discord?'),
      pick('cyberpunk', '¿Conoces Cyberpunk 2077 y su universo?'),
      pick(
        'rolSerio',
        '¿Tienes experiencia en servidores de rol serio, tanto de texto como de voz?',
      ),
    ],
  },
  {
    title: 'Motivación',
    fields: [
      long('motivo', '¿Por qué quieres formar parte del Equipo de Soporte de KiroshiRP?'),
      long('aporte', '¿Qué crees que puedes aportar al proyecto?'),
      long('cualidades', '¿Qué cualidades consideras fundamentales en un buen soporte?'),
      long(
        'irrespetuoso',
        '¿Cómo actuarías si un jugador te responde de forma irrespetuosa mientras intentas ayudarlo?',
      ),
      pick(
        'aprender',
        '¿Estarías dispuesto a aprender los sistemas propios del servidor antes de comenzar a atender tickets?',
      ),
    ],
  },
  {
    title: 'Situaciones prácticas',
    fields: [
      long(
        'insulto',
        'Un jugador abre un ticket porque otro usuario le ha insultado. ¿Cómo gestionarías la situación?',
      ),
      long(
        'versiones',
        'Dos jugadores presentan versiones completamente diferentes de un mismo conflicto. ¿Qué harías para resolverlo de forma justa?',
      ),
      long('amigo', 'Un amigo tuyo incumple una norma y otro jugador lo reporta. ¿Cómo actuarías?'),
      long(
        'desconocido',
        'Un usuario te pide información sobre una función del servidor que todavía no conoces. ¿Qué le responderías?',
      ),
      long(
        'perdida',
        'Un jugador está enfadado porque ha perdido objetos debido a un posible error del servidor. ¿Cómo gestionarías su reclamación?',
      ),
      long(
        'abuso',
        'Detectas que otro miembro del equipo de soporte está abusando de sus permisos. ¿Qué harías?',
      ),
      long(
        'sinPruebas',
        'Un jugador te solicita que sanciones a otro usuario, pero no aporta pruebas. ¿Cómo procederías?',
      ),
    ],
  },
  {
    title: 'Compromiso con el proyecto',
    fields: [
      pick(
        'decisiones',
        '¿Estás dispuesto a respetar las decisiones del equipo de administración aunque no estés de acuerdo con alguna de ellas?',
      ),
      pick(
        'confidencial',
        '¿Entiendes que toda la información interna del equipo debe mantenerse confidencial?',
      ),
      pick(
        'retirada',
        '¿Aceptarías que tu acceso al equipo de soporte pueda ser retirado si incumples las normas internas?',
      ),
      long(
        'extra',
        '¿Quieres añadir algo más sobre ti o explicar por qué deberíamos seleccionarte?',
        false,
      ),
    ],
  },
];

const fields = teamSections.flatMap((section) => section.fields);

// Devuelve { answers } con los valores limpios o { error } con el primer problema.
export function validateTeam(data) {
  const answers = {};
  for (const field of fields) {
    const raw = data?.answers?.[field.id];
    const value = typeof raw === 'string' || typeof raw === 'number' ? String(raw).trim() : '';
    if (!value) {
      if (field.required) return { error: `Falta responder: ${field.label}` };
      continue;
    }
    if (field.type === 'select' && !field.options.includes(value))
      return { error: `Respuesta no válida: ${field.label}` };
    if (field.type === 'number' && !(/^\d{1,2}$/.test(value) && Number(value) > 0))
      return { error: 'Introduce una edad válida.' };
    if (field.type !== 'select' && field.type !== 'number' && value.length > field.max)
      return {
        error: `Respuesta demasiado larga (máximo ${field.max} caracteres): ${field.label}`,
      };
    answers[field.id] = value;
  }
  if (data?.consent !== true)
    return {
      error: 'Confirma que aceptas que se guarden tus respuestas para revisar la solicitud.',
    };
  return { answers };
}
