// Ficha de personaje privada: una definición para pintar el formulario y validar el guardado.
const text = (id, label, hint = '') => ({ id, label, hint, type: 'text', max: 200 });
const long = (id, label, hint = '') => ({ id, label, hint, type: 'long', max: 8000 });

export const MAX_TOTAL = 50000; // caracteres entre todos los campos; cabe en un valor del Durable Object
export const MAX_IMAGES = 12;

export const characterSections = [
  {
    title: 'Identidad',
    intro: 'Quién es a simple vista.',
    fields: [
      text('alias', 'Apodo o alias', 'Cómo le llaman en la calle'),
      text('edad', 'Edad', 'Ej. 27'),
      text('genero', 'Género', 'Opcional'),
      text('complexion', 'Altura y complexión', 'Ej. 1,78 m · atlético'),
      text('origen', 'Origen', 'Nómada, Buscavidas, Corporativo…'),
      text('nacimiento', 'Lugar de nacimiento', 'Ciudad, distrito, Badlands…'),
      text('ocupacion', 'Ocupación', '¿A qué se dedica?'),
      text('grupo', 'Banda, corporación o grupo', 'Si pertenece a alguno'),
      text('vivienda', 'Dónde vive', 'Distrito, motel, nave, calle…'),
    ],
  },
  {
    title: 'Presencia',
    intro: 'Cómo se ve y cómo se comporta.',
    fields: [
      long('aspecto', 'Aspecto', 'Rasgos, cicatrices, tatuajes, estilo al vestir, cómo se mueve…'),
      long(
        'implantes',
        'Implantes y equipo',
        'Cromo visible u oculto, armas, objetos que siempre lleva.',
      ),
      long(
        'personalidad',
        'Personalidad',
        'Cómo habla, cómo reacciona, qué lo define, qué lo saca de quicio.',
      ),
      long('gustos', 'Gustos y manías', 'Música, comida, rutinas, supersticiones.'),
      long('habilidades', 'Habilidades y talentos', 'En qué es bueno y cómo lo aprendió.'),
      long('defectos', 'Defectos y vicios', 'Lo que le hace tropezar una y otra vez.'),
    ],
  },
  {
    title: 'Historia',
    intro: 'De dónde viene y qué le ha pasado.',
    fields: [
      long(
        'historia',
        'Historia',
        '¿De dónde viene? ¿Qué ha perdido? ¿Qué busca en Night City? Escribe todo lo que quieras.',
      ),
      long('infancia', 'Infancia y familia', 'Padres, hermanos, quién lo crió, cómo fue crecer.'),
      long(
        'cronologia',
        'Cronología y momentos clave',
        'Una línea por hecho importante: año, qué pasó y qué cambió.',
      ),
      long(
        'antecedentes',
        'Antecedentes y relación con la ley',
        'Delitos, deudas, fichas policiales, favores pendientes.',
      ),
    ],
  },
  {
    title: 'Vínculos y futuro',
    intro: 'Con quién cuenta y hacia dónde va.',
    fields: [
      long(
        'amistades',
        'Amistades, contactos y enemigos',
        'Quién le debe algo, a quién se lo debe él, quién lo quiere muerto.',
      ),
      long(
        'objetivos',
        'Objetivos y miedos',
        'Lo que quiere conseguir y lo que le quita el sueño.',
      ),
      {
        ...long('secretos', 'Secretos', 'Lo que nadie sabe. Solo tú puedes verlo.'),
        private: true,
      },
      long(
        'notas',
        'Notas de rol',
        'Ideas de escenas, evolución prevista, cosas que quieres rolear.',
      ),
    ],
  },
];

const fields = characterSections.flatMap((section) => section.fields);

// Cada cuenta puede tener hasta 3 personajes (huecos 1 a 3). El 1 conserva la clave original.
export const MAX_SLOTS = 3;
export const slotOf = (value) => {
  const n = Number(value ?? 1);
  return Number.isInteger(n) && n >= 1 && n <= MAX_SLOTS ? n : null;
};
export const sheetKey = (id, slot = 1) => 'character-sheet:' + id + (slot > 1 ? '#' + slot : '');
export const sheetKeys = (id) => Array.from({ length: MAX_SLOTS }, (_, i) => sheetKey(id, i + 1));

// Devuelve { values, images } limpios o { error }.
export function validateCharacter(data) {
  const values = {};
  let total = 0;
  for (const field of fields) {
    const raw = data?.values?.[field.id];
    const value = typeof raw === 'string' ? raw.trim() : '';
    if (!value) continue;
    if (value.length > field.max)
      return { error: `Demasiado largo (máximo ${field.max} caracteres): ${field.label}` };
    total += value.length;
    values[field.id] = value;
  }
  if (total > MAX_TOTAL) return { error: `La ficha supera los ${MAX_TOTAL} caracteres.` };
  const images = Array.isArray(data?.images) ? data.images : [];
  if (images.length > MAX_IMAGES) return { error: `Máximo ${MAX_IMAGES} enlaces de imágenes.` };
  const clean = [];
  for (const raw of images) {
    const link = typeof raw === 'string' ? raw.trim() : '';
    if (!link) continue;
    let parsed;
    try {
      parsed = new URL(link);
    } catch {}
    if (parsed?.protocol !== 'https:' || link.length > 500)
      return {
        error: 'Los enlaces de imágenes deben empezar por https:// (máximo 500 caracteres).',
      };
    clean.push(parsed.href);
  }
  return { values, images: clean };
}

// Porcentaje de campos de texto rellenados.
export const progress = (values) =>
  Math.round((fields.filter((f) => values?.[f.id]).length / fields.length) * 100);
