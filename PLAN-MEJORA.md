# Plan de mejora, organización y pulido

Rama de trabajo: `pruebas`. Nada pasa a `main` hasta probarlo aquí. Cloudflare Pages publica `main` automáticamente, así que `main` solo recibe lo aprobado.

## Estado de partida (medido el 2026-11-12)

| Comprobación | Resultado |
|---|---|
| `npm run build` (astro check + build + pagefind) | Correcto, 62 páginas indexadas |
| `npm run admin:test` | 24/24 |
| `tests/explorer.test.mjs` | 6/6 |
| `scripts/verify.mjs` | 78 páginas, 3608 enlaces y anclas OK |
| `npm audit` | Vulnerabilidades en dependencias transitivas (`undici` alta, `fast-uri` moderada) |

El proyecto funciona y tiene buenas pruebas de seguridad en el panel. Los problemas son de mantenibilidad, no de funcionamiento.

## Hallazgos

1. **Código comprimido a mano.** Unas 2.000 líneas de código reparten 323 KB, y 162 líneas pasan de 300 caracteres (`src/pages/*.astro`, `admin/*.mjs`, `admin/ui/app.js`). Es difícil de revisar, de comparar en git y de modificar sin romper algo.
2. **CSS en siete capas superpuestas.** `global`, `visual`, `explorer`, `refinement`, `optics`, `clean` y `reference` se importan en cadena y se sobrescriben entre sí (por ejemplo `clean.css` redefine la cabecera y el `main`). Hay selectores repetidos en varios archivos y 13 usos de `!important`. Cualquier cambio visual exige adivinar qué capa gana.
3. **Datos y textos dentro del código.** En `src/pages/[section].astro` viven las listas de destacados (`picks`) y los textos de introducción (`notes`). Deberían estar en `src/data/`, como ya ocurre con `portal.json` y `home.json`.
4. **Archivos grandes sin dividir.** `admin/ui/app.js` (25 KB, una sola línea lógica por función larga), `admin/service.mjs` y `scripts/seed-content.mjs` (28 KB, ya sin uso en la compilación).
5. **Despliegue duplicado y confuso.** El README dice que Cloudflare Pages publica `main`, pero `.github/workflows/deploy.yml` sigue compilando y publicando en GitHub Pages en cada push a `main`. Solo debería existir para la redirección heredada, o desaparecer.
6. **Sin integración continua en ramas.** Nada ejecuta build ni tests en `pruebas` ni en pull requests. Hoy los fallos se descubren tras publicar.
7. **Dependencias.** Avisos de `npm audit`; `wrangler` y `yaml`/`zod` fijados a versión exacta sin tarea de actualización.
8. **Documentación dispersa.** `README.md`, `ADMIN.md`, `CONTENIDO-PENDIENTE.md` y `CONTENT-LICENSE.md` repiten parte del contenido. El README mezcla instalación, despliegue, edición de contenido y estado del proyecto.
9. **Pruebas solo en el panel y el explorador.** No hay pruebas de esquema de contenido, de rutas ni de configuración.

## Fases

Cada fase es un conjunto de commits pequeños en `pruebas`. Al terminar cada fase se ejecuta la batería completa (`npm run build`, `npm run admin:test`, `node --test tests/*.test.mjs`, `node scripts/verify.mjs`) y se compara la salida de `dist/` antes y después: en las fases de refactor, el HTML generado debe ser idéntico salvo diferencias deliberadas.

### Fase 0: red de seguridad (primero)
- Añadir CI (`.github/workflows/ci.yml`) que ejecute build, tests y `verify` en `pruebas` y en pull requests.
- Guardar una instantánea de `dist/` de `main` para comparar después de cada refactor.
- Añadir pruebas del esquema de contenido (`content.config.ts`) y de `config.ts`.

### Fase 1: formato y legibilidad del código
- Añadir Prettier y `.editorconfig`; formatear `src/`, `admin/`, `scripts/` y `tests/` sin cambiar comportamiento.
- Añadir `npm run format` y `npm run lint`.
- Esta fase solo toca formato, para que el diff sea mecánico y revisable.

### Fase 2: separar datos de código
- Mover `picks`, `notes` y demás constantes de `[section].astro`, `index.astro` y `DistrictAtlas.astro` a `src/data/`.
- Validar esos datos con `zod` en `src/config.ts`.
- Dividir `[section].astro` en componentes pequeños (lista, destacados, estado de normativas).

### Fase 3: consolidar el CSS
- Definir variables de diseño (color, espacio, tipografía) en un único `tokens.css`.
- Fusionar las siete hojas en capas con propósito: `base`, `layout`, `components`, `pages`.
- Eliminar reglas sobrescritas y los `!important` innecesarios.
- Comprobar con capturas (Playwright, ya disponible) escritorio y móvil en inicio, una sección, un artículo, `/explorar/` y `/buscar/`.

### Fase 4: panel de administración
- Partir `admin/ui/app.js` por responsabilidad (lista, editor, borradores, imágenes, ajustes) usando los módulos que ya existen (`editor.js`, `preview.js`).
- Partir `admin/service.mjs` en rutas (`auth`, `content`, `media`, `drafts`).
- Mantener intactas las 24 pruebas de seguridad; añadir pruebas por cada módulo nuevo.
- Revisar la política de cabeceras (CSP) y la caducidad de sesión.

### Fase 5: despliegue y dependencias
- Decidir el destino de `deploy.yml` (ver preguntas abajo).
- Ejecutar `npm audit fix` y subir dependencias en un commit aparte; repetir build y pruebas.
- Documentar el flujo `pruebas` → revisión → `main`.
- Mover o eliminar `scripts/seed-content.mjs` si ya no se usa.

### Fase 6: documentación y contenido
- Reordenar el README: instalación, scripts, flujo de ramas, despliegue. Mover la edición de contenido a `CONTENIDO.md`.
- Unificar `CONTENIDO-PENDIENTE.md` con la lista de datos pendientes del README.
- Revisar con la skill `humanizer` los textos largos en español que suenen a plantilla (introducciones, avisos, FAQ). La skill está pensada para inglés, así que sirve como guía de patrones y se corrige a mano el resultado.

## Flujo de trabajo propuesto

1. Todo cambio se hace en `pruebas`.
2. Se prueba en la vista previa de Cloudflare Pages de esa rama (`pruebas.kiroshirp.pages.dev`, si las vistas previas de ramas están activas en el proyecto).
3. Lo aprobado se lleva a `main` con un pull request o con cherry-pick, para publicar solo lo revisado.

## Riesgos

- Reescribir CSS puede alterar el aspecto. Mitigación: capturas antes y después, y fases pequeñas.
- El formato masivo ensucia el historial. Mitigación: commit propio y `.git-blame-ignore-revs`.
- El panel tiene credenciales y pruebas de seguridad. Mitigación: no tocar lógica de autenticación sin pruebas verdes.

## Preguntas abiertas

1. ¿El proyecto de Cloudflare Pages tiene activadas las vistas previas para ramas distintas de `main`?
2. ¿Sigue haciendo falta la redirección desde GitHub Pages (`kiroshirp.github.io`)?
3. ¿Hay un orden de prioridad entre código, aspecto visual y documentación?
