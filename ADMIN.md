# Administración privada de KiroshiRP

La web pública permanece en GitHub Pages. El administrador se ejecuta de forma independiente: en Cloudflare Workers para usarlo desde Internet, o en el ordenador para edición local. No existen cuentas de jugadores.

## Configurar el archivo privado

Completa `.env` en la raíz de este proyecto. Está excluido de Git; nunca lo subas mediante el formulario de archivos de GitHub ni lo copies a `public/`. `.env.example` es solo una plantilla vacía y sí puede publicarse. No uses prefijos `PUBLIC_` o `VITE_` en secretos.

Campos:

- `ADMIN_USERNAME`: usuario del equipo.
- `ADMIN_PASSWORD`: contraseña propia de este administrador, de al menos 16 caracteres. No reutilices la de GitHub o Cloudflare. Para valores con espacios o `#`, utiliza comillas dobles.
- `ADMIN_PORT`: puerto local, por defecto 4310.
- `CLOUDFLARE_ACCOUNT_ID`: identificador de la cuenta que alojará el Worker.
- `CLOUDFLARE_API_TOKEN`: token limitado a esa cuenta para desplegar Workers y sus recursos Durable Objects. El despliegue utiliza autenticación mediante token; no requiere compartir la contraseña de Cloudflare.
- `GITHUB_TOKEN`: token granular con acceso exclusivamente a `kiroshirp/KiroshiRP`, permiso **Contents: read and write**. El administrador no necesita permisos para gestionar otros repositorios ni modificar workflows. Respeta las restricciones de rama de GitHub; no las desactives para el panel.

No envíes estos valores por chat. No se incluyen en el HTML, los recursos estáticos ni las respuestas del administrador. Las credenciales de acceso y el token de GitHub se cargan como secretos de Cloudflare al desplegar; el token de despliegue de Cloudflare se queda en el entorno local.

## Usarlo en el ordenador

```sh
npm ci
npm run admin
```

Abre `http://127.0.0.1:4310/admin/`. Solo escucha en la interfaz local. Requiere usuario y contraseña; las credenciales de Cloudflare y GitHub no son necesarias para este modo. Los cambios afectan al proyecto local, no al portal publicado. Reinicia el servicio si modificas `.env`.

## Publicar en Cloudflare Workers

Primero completa todos los campos privados y verifica que la cuenta permite Workers y Durable Objects. No se presupone ningún dominio ni configuración DNS existente.

```sh
npm run admin:test
npm run admin:check
npm run admin:deploy
```

El último comando despliega el Worker y carga mediante entrada estándar únicamente `ADMIN_USERNAME`, `ADMIN_PASSWORD` y `GITHUB_TOKEN` como secretos, sin imprimir sus valores ni crear archivos temporales con ellos. La configuración pública está en `wrangler.jsonc`; el código del Worker está en `admin/worker.mjs`. Solo `admin/ui/` se sube como recursos del administrador, nunca la raíz del proyecto ni `.env`. Hasta tener los secretos configurados, la API devuelve «pendiente de configurar».

El comando muestra la dirección real de `workers.dev` devuelta por Cloudflare. Comprueba allí `/admin/`. Después completa `site.adminUrl` en `src/data/portal.json` con esa URL HTTPS verificada y publica los cambios del portal en GitHub. Su ruta `/KiroshiRP/admin/` ofrecerá el acceso al administrador privado. La ruta no puede ejecutar el servicio dentro de GitHub Pages; abre el servicio de Cloudflare, que valida el acceso en su propio origen. Un dominio personalizado requeriría configurar y verificar su ruta por separado.

El contenido inicial, los esquemas compartidos y la configuración JSON deben estar también en `main` antes de editar mediante el Worker. `npm run admin:publish-source` publica exclusivamente una lista revisada de los archivos de esta implementación, en un único commit sin forzar la rama; incluye una comprobación para impedir subir valores privados. No publiques únicamente el Worker sin publicar estos archivos del proyecto.

## Gestionar el portal

El panel permite buscar, crear, editar y eliminar artículos de Lore, Mecánicas, Normativas, Facciones, Guías y Actualizaciones; gestionar imágenes PNG/JPEG/WebP/AVIF (máximo 4 MB); y editar la configuración central del portal. Los campos habituales del artículo tienen formulario; el contenido se escribe en Markdown. Las fuentes, licencia, relaciones, imagen, historial y opciones adicionales se editan como JSON estructurado. No ejecuta código de los artículos dentro del panel.

`src/data/portal.json` centraliza enlaces públicos, navegación, fases y parámetros compartidos. `src/data/home.json` permite editar los textos y tarjetas de la portada; `src/data/legal.json`, las páginas de contacto y avisos. Los archivos necesarios de configuración no se pueden eliminar; se modifican mediante su editor. Las plantillas y el código de la web se mantienen en el proyecto, fuera del editor de contenidos. El administrador nunca ofrece acceso a `.env`, workflows ni archivos fuera de la lista permitida.

**Los borradores de documentación son visibles en el portal** con su aviso editorial. Solo las noticias con `published: false` están excluidas de la generación pública. Cambiar «Borrador» por «Confirmado» no demuestra que una mecánica esté implementada: requiere revisión del equipo. Se rechaza retirar la marca de licencia a un artículo previamente adaptado; conserva siempre sus fuentes y atribuciones.

En Cloudflare, cada guardado o eliminación crea un commit real en `main`. GitHub Actions comprobará y publicará el portal; revisa el resultado en `https://github.com/kiroshirp/KiroshiRP/actions`. Un guardado correcto significa que GitHub recibió el contenido, no que el despliegue haya terminado. Las ediciones que parten de una versión antigua se rechazan para evitar sobrescribir cambios ajenos. Evita ediciones simultáneas desde el modo local y Cloudflare sin sincronizar primero el repositorio.

Antes de eliminar, revisa enlaces e imágenes relacionados. La eliminación exige escribir la ruta exacta. Si una referencia queda rota, corrígela antes de publicar. El panel no inventa nuevos destinos para sustituir contenidos eliminados.

## Recuperación y seguridad

- En local, cada sustitución o eliminación conserva la versión anterior en `.admin-backups/`, excluida de Git. Copia el archivo conservado a su ruta original para recuperarlo; esta carpeta no se publica.
- En Cloudflare, recupera una versión anterior desde el historial Git del archivo y publica una nueva revisión. No se purga el historial al eliminar un documento.
- Las sesiones duran dos horas, usan cookie HttpOnly y SameSite Strict; en Cloudflare llevan además Secure y prefijo `__Host-`. La sesión se invalida al cerrar sesión, caducar o cambiar las credenciales.
- Las escrituras requieren origen propio y token CSRF. Se limitan a cinco intentos de acceso fallidos por dirección en quince minutos. Las sesiones y los intentos se guardan en un Durable Object; se eliminan registros caducados periódicamente.
- Los secretos no se pueden consultar ni editar desde el panel. Para rotarlos, modifica `.env` y vuelve a desplegar el administrador. Nunca abras el servicio local a todas las interfaces como sustitución del despliegue HTTPS.

## Comprobaciones

```sh
npm run admin:test
npm run check
npm run build
node scripts/verify.mjs
npm run admin:check
```

Las pruebas cubren acceso anónimo, límite de intentos, sesiones, CSRF, rutas, validación, conflictos de versión, copias de seguridad, eliminación confirmada, atribución y peticiones a GitHub. `admin:check` empaqueta el Worker sin publicarlo ni transmitir credenciales.

Referencias de la arquitectura: [GitHub Pages estático](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages), [API de contenidos de GitHub](https://docs.github.com/en/rest/repos/contents), [recursos estáticos de Workers](https://developers.cloudflare.com/workers/static-assets/binding/).
