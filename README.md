# KiroshiRP — portal público

Portal estático en español con Astro, TypeScript, contenido Markdown validado y Pagefind. El portal público no requiere backend, registro ni cuentas de jugadores. La administración privada del equipo utiliza un servicio separado; consulta ADMIN.md. La búsqueda no utiliza servicios de pago. Las fuentes se alojan localmente. CSS propio con la paleta de KiroshiRP.

## Instalación

Requiere Node.js 22.12 o superior y npm.

```sh
npm ci
npm run dev
```

Desarrollo: `http://127.0.0.1:4321/KiroshiRP/`. La búsqueda requiere el índice de producción:

```sh
npm run build
npm run preview
```

`build` valida TypeScript y los artículos, genera las páginas y crea el índice Pagefind. La vista previa usa el puerto indicado en la terminal (normalmente 4321).

## Contenido y mantenimiento

Los archivos de `src/content/{lore,mecanicas,normativas,facciones,guias,actualizaciones}` son Markdown. Las rutas se obtienen del nombre del archivo. El esquema está en `src/content.config.ts`. Copia una ficha existente para crear otra.

Campos: `title`, `description`, `category`, `status` (Borrador, Propuesta, Por documentar o Confirmado), `origin` (CANON CYBERPUNK, LORE KIROSHIRP o GUÍA DEL PORTAL), `updated` (YYYY-MM-DD), `related` (rutas sin dominio), `order`. Facciones admite `factionStatus`: Activa, Prevista o En desarrollo. `sources` admite pares `label`/`url`.

Los borradores de documentación son visibles con aviso explícito. Las actualizaciones requieren `published: true` para generar página, aparecer en el inicio e indexarse. No actives la plantilla hasta reemplazar título, cuerpo y fecha por un anuncio real. Categorías de anuncios: Noticias, Desarrollo, Mecánicas, Normativas, Eventos y Mantenimiento.

Los títulos `##` generan índice y anclas estables; Pagefind indexa apartados. El historial inicial registra la preparación editorial; añade revisiones reales al cuerpo de cada ficha al modificarla.

`src/data/portal.json` centraliza navegación, Discord, contacto, fases de cyberpsicosis y parámetros de liderazgo; `src/config.ts` valida y expone esos datos. `src/data/home.json` contiene los textos y tarjetas de la portada; `src/data/legal.json`, las páginas de contacto y avisos. No copies umbrales en artículos: las páginas de mecánicas y normativas leen la misma tabla. Valores `null` significan pendiente, nunca cero. Los campos de enlace vacíos muestran un estado informativo, sin URLs inventadas.

`src/components/Notice.astro` ofrece bloques `warning`, `lore`, `rule`, `development`, `example` y `tip` reutilizables en plantillas. En Markdown, utiliza citas para ejemplos y negrita para advertencias. No conviertas propuestas en reglas vigentes sin revisión del equipo.

## Publicar en GitHub Pages

Repositorio objetivo: `kiroshirp/KiroshiRP`. En Settings → Pages → Source selecciona **GitHub Actions**. Cada subida a `main` ejecuta `.github/workflows/deploy.yml`: instalación reproducible, validación, compilación, índice y despliegue.

Configuración por defecto: `https://kiroshirp.github.io/KiroshiRP/`. Para un dominio personalizado, define las variables de repositorio `SITE_URL` (origen HTTPS del dominio) y `BASE_PATH` (`/` para raíz), configura ese dominio en GitHub Pages y sus DNS. No añadas un dominio o registros DNS sin verificarlos. Cloudflare puede gestionar DNS, pero no es necesario para este despliegue y no se presupone ninguna vinculación.

Los recursos y enlaces internos respetan `BASE_PATH`. El sitemap y Open Graph utilizan `SITE_URL`. Para volver atrás, revierte el commit correspondiente y permite que Actions publique de nuevo. Nunca guardes tokens o credenciales en el repositorio.

## Comprobaciones

```sh
npm run build
node scripts/verify.mjs
npm audit
```

La comprobación local revisa enlaces internos, anclas, recursos y ausencia de la plantilla de noticias en la salida. Prueba también búsqueda, filtro de categorías, menú móvil y teclado en la vista previa.

## Datos pendientes del equipo

- URL oficial de Discord y canal de contacto.
- Requisitos y conexión de OPEN//77 verificados, sin fecha de apertura inventada.
- Síntesis canónica respaldada por fuentes, historia propia aprobada y disponibilidad de facciones.
- Normas definitivas, parámetros de liderazgo y mecánicas efectivamente implementadas.
- Identificación del responsable y revisión de avisos legales y atribuciones de imágenes.

El fondo original facilitado se conserva en `public/images/kiroshi-original.jpg`. No se edita el material sincronizado del proyecto. El símbolo de navegación es tipográfico; el emblema oficial aparece dentro de la imagen original del hero. El resto de las fichas evita imágenes genéricas y usa detalles técnicos propios.

El script `scripts/seed-content.mjs` sirvió para preparar las fichas iniciales. No forma parte de la compilación ni sobrescribe archivos existentes.
Las imágenes opcionales se declaran como image: {path: images/archivo.jpg, alt: Descripción}. El historial admite history: [{date: 2026-10-16, description: Resumen del cambio}]. Guarda las imágenes en public/images/.

Los artículos Documentado contienen información incorporada de la wiki; no anuncian funciones implementadas. universeScope identifica su época y licensedText activa la atribución CC BY-SA 3.0. Consulta CONTENT-LICENSE.md para distinguir la licencia del texto y la del código.


## Panel privado del equipo

Consulta [ADMIN.md](ADMIN.md) para configurar el .env privado, usar /admin localmente o desplegar el administrador en Cloudflare Workers. El panel gestiona los artículos, las imágenes y los archivos de datos del portal sin publicar credenciales.

## Explorador visual de zonas

La página /explorar/ reúne los seis distritos y las Badlands. No utiliza cuentas, servicios de mapas ni imágenes de Piggyback; sus dos recursos se enlazan como consultas externas.

Los datos se editan en las fichas originales de src/content/lore, dentro de «## Vista rápida», conservando los subtítulos «### Ambiente», «### Lugares de referencia» y «### Organizaciones relacionadas». Los lugares usan listas con el formato **Nombre:** descripción; las organizaciones, un enlace relativo a su ficha seguido de una raya y su contexto. Si no hay relaciones verificadas, se conserva una explicación sin atribuir territorios. No añadas fórmulas internas, localizaciones privadas ni estados de apertura supuestos. El aviso de disponibilidad remite al Protocolo Umbral.

La extracción compartida está en src/lib/explorer.mjs y las comprobaciones se ejecutan con node --test tests/explorer.test.mjs. El explorador admite enlaces como /explorar/?zona=watson#explorador; sin JavaScript muestra las siete fichas y sus enlaces. El texto adaptado de la wiki conserva sus fuentes y CC BY-SA 3.0.
