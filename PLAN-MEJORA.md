# Plan de mejora, organización y pulido

Rama de trabajo: `pruebas`. Nada pasa a `main` hasta probarlo aquí. Cloudflare Pages publica `main` automáticamente, así que `main` solo recibe lo aprobado.

## Estado de partida (medido el 2026-11-12)

| Comprobación                                     | Resultado                                                                         |
| ------------------------------------------------ | --------------------------------------------------------------------------------- |
| `npm run build` (astro check + build + pagefind) | Correcto, 62 páginas indexadas                                                    |
| `npm run admin:test`                             | 24/24                                                                             |
| `tests/explorer.test.mjs`                        | 6/6                                                                               |
| `scripts/verify.mjs`                             | 78 páginas, 3608 enlaces y anclas OK                                              |
| `npm audit`                                      | Vulnerabilidades en dependencias transitivas (`undici` alta, `fast-uri` moderada) |

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

- ~~Añadir CI (`.github/workflows/ci.yml`)~~ Hecho: build, tests y `verify` en ramas y pull requests.
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

### Fase 3: consolidar el CSS (hecha, ver notas)

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

- Mantener `deploy.yml` solo como redirección heredada.
- Ejecutar `npm audit fix` y subir dependencias en un commit aparte; repetir build y pruebas.
- Documentar el flujo `pruebas` → revisión → `main`.
- Mover o eliminar `scripts/seed-content.mjs` si ya no se usa.

### Fase 6: documentación y contenido

- Reordenar el README: instalación, scripts, flujo de ramas, despliegue. Mover la edición de contenido a `CONTENIDO.md`.
- Unificar `CONTENIDO-PENDIENTE.md` con la lista de datos pendientes del README.
- Revisar con la skill `humanizer` los textos largos en español que suenen a plantilla (introducciones, avisos, FAQ). La skill está pensada para inglés, así que sirve como guía de patrones y se corrige a mano el resultado.

## Flujo de trabajo (decidido)

1. Todo cambio se hace en `pruebas` (o en ramas que salgan de ella).
2. GitHub Actions (`ci.yml`) compila y ejecuta build, tests y `verify` en cada push a una rama distinta de `main` y en cada pull request. Guarda `dist/` como artefacto descargable para revisarlo en local con `npm run preview`.
3. Lo aprobado se lleva a `main` con un pull request.
4. Cloudflare Pages detecta el cambio en `main` y publica. `main` es la única rama que despliega.

Las ramas de GitHub no sirven una web de prueba por sí solas: eso lo da la vista previa de Cloudflare, que no se usará. La prueba se hace con la CI y el artefacto.

## Redirección de GitHub Pages (decidido)

Se mantiene, porque no cuesta nada y conserva los enlaces antiguos. Queda como único trabajo de `deploy.yml` y solo se ejecuta en `main`.

## Riesgos

- Reescribir CSS puede alterar el aspecto. Mitigación: capturas antes y después, y fases pequeñas.
- El formato masivo ensucia el historial. Mitigación: commit propio y `.git-blame-ignore-revs`.
- El panel tiene credenciales y pruebas de seguridad. Mitigación: no tocar lógica de autenticación sin pruebas verdes.

## Prioridad (decidida)

1. Código. 2. Aspecto visual. 3. Documentación. Las fases 1 a 5 son de código; la fase 3 (CSS) cubre lo visual; la documentación va al final.

## Notas de la fase 3

- Las siete hojas (136 KB) pasaron a `tokens.css` (variables) y `portal.css` (124 KB). El orden de la cascada se conserva y cada bloque lleva un comentario con su origen.
- Se eliminaron 429 declaraciones que una regla posterior con el mismo selector ya sobrescribía, y 84 reglas que quedaron vacías. Se tokenizaron los colores más repetidos.
- No se reordenaron reglas entre bloques: eso puede cambiar la cascada y necesita revisión visual. Queda como mejora opcional.
- Los 29 `!important` restantes se conservan: cada uno compensa una regla de otro bloque o de una media query.
- `scripts/css-snapshot.mjs` guarda los estilos calculados de todas las páginas en escritorio y móvil y los compara entre dos versiones (`npm run css:snapshot -- <carpeta> dist`, y `-- --compare <a> <b>`). Resultado: 154 de 156 archivos idénticos; los otros dos (portada) solo difieren en cómo se escribe un degradado, con el mismo resultado visual.

## Notas de la fase 4

- `admin/service.mjs` (279 líneas) quedó como enrutador. La lógica pasó a `admin/http.mjs` (respuestas y cabeceras de seguridad, lectura del cuerpo con límite), `admin/api/session.mjs` (sesión, login, cierre, límite de intentos), `admin/api/solicitudes.mjs`, `admin/api/files.mjs` y `admin/config.mjs`.
- `admin/ui/app.js` (913 líneas) se dividió en `main.js`, `state.js` (estado compartido), `dom.js`, `api.js`, `catalog.js`, `session.js`, `editor-view.js` y cuatro módulos de eventos. Todas las variables compartidas pasaron a `state.*`.
- Se mantuvo la política de cabeceras (CSP) y el orden exacto de los atributos de la cookie; las 24 pruebas de seguridad pasan sin cambios.
- Nueva prueba `tests/admin-ui.test.mjs` con navegador real: entrar, abrir artículo, guardar borrador, validar, eliminar borrador, crear artículo, abrir configuración e imágenes, salir. Pasa igual contra el panel original y el refactorizado. Se omite si Playwright no está instalado; la CI lo instala.
- La CI ahora también ejecuta `npm run admin:check` (compilación del Worker en seco).
- `scripts/publish-admin-source.mjs` mantiene una lista fija de archivos que ya estaba desactualizada (no incluye `editorial.mjs`, `local-store.mjs` ni `sections.json`). Se añadieron los archivos nuevos, pero conviene decidir en la fase 5 si sigue haciendo falta.
