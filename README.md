# KiroshiRP: portal público

Portal estático en español hecho con Astro, TypeScript, contenido Markdown validado y Pagefind. No necesita backend, registro ni cuentas de jugadores. La búsqueda no usa servicios de pago, las fuentes se alojan en el propio sitio y el CSS es propio, con la paleta de KiroshiRP. El equipo gestiona el contenido desde un panel privado que corre como servicio aparte (ver [ADMIN.md](ADMIN.md)).

## Primeros pasos

Requiere Node.js 22.12 o superior y npm.

```sh
npm ci
npm run dev
```

El servidor de desarrollo escucha en `http://127.0.0.1:4321/`. La búsqueda necesita el índice de producción, así que para probarla hay que compilar:

```sh
npm run build
npm run preview
```

`build` valida TypeScript y los artículos, genera las páginas y crea el índice Pagefind. La vista previa usa el puerto que indique la terminal, normalmente 4321.

## Scripts

| Comando                                   | Qué hace                                                                    |
| ----------------------------------------- | --------------------------------------------------------------------------- |
| `npm run dev`                             | Servidor de desarrollo                                                      |
| `npm run build`                           | Comprueba tipos y contenido, genera `dist/` y el índice de búsqueda         |
| `npm run preview`                         | Sirve `dist/` en local                                                      |
| `npm run check`                           | Solo comprobación de tipos y contenido                                      |
| `npm run format` / `npm run format:check` | Aplica o comprueba el formato con Prettier                                  |
| `npm run admin`                           | Panel privado en local                                                      |
| `npm run admin:test`                      | Pruebas del panel (seguridad y acceso)                                      |
| `npm run admin:check`                     | Compila el Worker del panel sin desplegarlo                                 |
| `npm run css:snapshot -- <carpeta> dist`  | Guarda los estilos calculados de todas las páginas para compararlos después |
| `node --test tests/*.test.mjs`            | Pruebas del portal; la del panel en navegador necesita Playwright           |
| `node scripts/verify.mjs`                 | Revisa enlaces internos, anclas y recursos en `dist/`                       |

## Estructura

```
src/content/      Fichas en Markdown (lore, mecanicas, normativas, facciones, guias, actualizaciones)
src/data/         Textos y parámetros en JSON (portal, home, legal, sections, regulation-documents)
src/pages/        Rutas de Astro
src/components/   Componentes
src/styles/       tokens.css (variables) y portal.css (hoja principal)
src/scripts/      JavaScript del navegador
admin/            Panel privado: API (api/), interfaz (ui/) y pruebas (tests/)
scripts/          Utilidades de mantenimiento
tests/            Pruebas del portal
```

La edición de fichas y datos se explica en [CONTENIDO.md](CONTENIDO.md).

## Flujo de trabajo

Los cambios se preparan en la rama `pruebas`. En cada push a una rama distinta de `main` y en cada pull request, GitHub Actions (`.github/workflows/ci.yml`) comprueba el formato, compila, ejecuta las pruebas y guarda la web compilada como artefacto durante siete días. Se descarga y se abre con `npm run preview`.

Lo aprobado pasa a `main` con un pull request. Solo `main` se publica.

## Publicar en Cloudflare Pages

La web oficial es `https://kiroshirp.pages.dev/`. Cloudflare Pages está conectado a `kiroshirp/KiroshiRP`: cada cambio en `main` se compila con `npm run build` (Node 22) y se publica `dist`.

La dirección antigua de GitHub Pages redirige a Cloudflare Pages mediante `.github/workflows/deploy.yml`. Para un dominio propio, actualiza `SITE_URL`, la configuración del proyecto Pages y sus DNS cuando el dominio esté verificado.

Los recursos y enlaces internos respetan `BASE_PATH`. El sitemap y Open Graph usan `SITE_URL`. Para volver atrás, revierte el commit en `main` y comprueba el nuevo despliegue. No guardes tokens ni credenciales en el repositorio.

## Comprobaciones

```sh
npm run format:check
npm run build
node scripts/verify.mjs
node --test tests/*.test.mjs
npm run admin:test
npm audit
```

`verify.mjs` revisa enlaces internos, anclas, recursos y que la plantilla de noticias no aparezca en la salida. En la vista previa conviene probar a mano la búsqueda, el filtro de categorías, el menú móvil y el teclado.

## Otros documentos

- [CONTENIDO.md](CONTENIDO.md): campos de las fichas, datos del portal, imágenes y explorador de zonas.
- [ADMIN.md](ADMIN.md): configuración y despliegue del panel privado.
- [CONTENIDO-PENDIENTE.md](CONTENIDO-PENDIENTE.md): decisiones y datos que faltan por parte del equipo.
- [CONTENT-LICENSE.md](CONTENT-LICENSE.md): licencia del texto y del código.
- [PLAN-MEJORA.md](PLAN-MEJORA.md): plan y notas de la reorganización del código.
