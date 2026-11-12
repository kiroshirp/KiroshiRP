# Edición de contenido

Los archivos de `src/content/{lore,mecanicas,normativas,facciones,guias,actualizaciones}` son Markdown. La ruta de cada página sale del nombre del archivo y el esquema está en `src/content.config.ts`. Para crear una ficha, copia una existente.

## Campos de una ficha

- `title`, `description`, `category` y `order`.
- `status`: Borrador, Propuesta, Por documentar o Confirmado.
- `origin`: CANON CYBERPUNK, LORE KIROSHIRP o GUÍA DEL PORTAL.
- `updated`: fecha en formato YYYY-MM-DD.
- `related`: rutas sin dominio.
- `sources`: pares `label` y `url`.
- `factionStatus` (solo facciones): Activa, Prevista o En desarrollo.
- `image`: `{path: images/archivo.jpg, alt: Descripción}`. Las imágenes van en `public/images/`.
- `history`: `[{date: 2026-10-16, description: Resumen del cambio}]`. Añade una revisión real al modificar una ficha.
- `universeScope`: época del artículo. `licensedText` activa la atribución CC BY-SA 3.0 (ver [CONTENT-LICENSE.md](CONTENT-LICENSE.md)).

Los artículos Documentado reúnen información de la wiki y no anuncian funciones implementadas.

Los títulos `##` generan el índice y anclas estables, y Pagefind indexa cada apartado.

## Borradores y actualizaciones

Los borradores de documentación se ven con un aviso explícito. Las actualizaciones necesitan `published: true` para generar página, aparecer en el inicio e indexarse. La plantilla se queda sin publicar hasta que se sustituyan título, cuerpo y fecha por un anuncio real. Las categorías de anuncio son Noticias, Desarrollo, Mecánicas, Normativas, Eventos y Mantenimiento.

## Datos del portal

Los textos y parámetros viven en `src/data/`, y `src/config.ts` los valida con zod antes de compilar.

- `portal.json`: navegación, Discord, contacto, fases de cyberpsicosis y parámetros de liderazgo.
- `home.json`: textos y tarjetas de la portada.
- `legal.json`: páginas de contacto y avisos.
- `sections.json`: portada, notas de introducción y fichas destacadas de cada sección. Los destacados deben existir en `src/content/<sección>/`; `tests/sections.test.mjs` lo comprueba.
- `regulation-documents.json`: versión de los borradores de normativas.

Los umbrales se escriben una sola vez, en estas tablas, y las páginas de mecánicas y normativas los leen de ahí. Un valor `null` significa pendiente, nunca cero. Un campo de enlace vacío muestra un estado informativo, sin URL inventada.

## Avisos en las fichas

`src/components/Notice.astro` ofrece los bloques `warning`, `lore`, `rule`, `development`, `example` y `tip`. En Markdown, los ejemplos van en citas y las advertencias en negrita. Una propuesta no se convierte en regla vigente sin revisión del equipo.

## Imágenes

El fondo original se conserva en `public/images/kiroshi-original.jpg` y no se edita. El símbolo de navegación es tipográfico y el emblema oficial aparece dentro de la imagen original de la portada. El resto de las fichas usa detalles técnicos propios en lugar de imágenes genéricas.

## Explorador de zonas

La página `/explorar/` reúne los seis distritos y las Badlands. No usa cuentas, servicios de mapas ni imágenes de Piggyback; sus dos recursos se enlazan como consultas externas.

Los datos se editan en las fichas de `src/content/lore`, dentro de «## Vista rápida», con los subtítulos «### Ambiente», «### Lugares de referencia» y «### Organizaciones relacionadas». Los lugares son una lista con el formato **Nombre:** descripción. Las organizaciones llevan un enlace relativo a su ficha, una raya y su contexto. Si no hay relaciones verificadas, se deja una explicación sin atribuir territorios. No añadas fórmulas internas, localizaciones privadas ni estados de apertura supuestos. El aviso de disponibilidad remite al Protocolo Umbral.

La extracción compartida está en `src/lib/explorer.mjs` y se prueba con `node --test tests/explorer.test.mjs`. El explorador admite enlaces como `/explorar/?zona=watson#explorador`. Sin JavaScript muestra las siete fichas con sus enlaces. El texto adaptado de la wiki conserva sus fuentes y la licencia CC BY-SA 3.0.
