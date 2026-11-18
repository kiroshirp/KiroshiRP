# Panel privado y cuentas de KiroshiRP

La web pública es estática y se publica en Cloudflare Pages desde `main`. Un Worker de Cloudflare aparte (`kiroshirp-admin`) gestiona las cuentas de Discord y el panel del equipo. **El panel ya no edita el contenido de la web**: los artículos se cambian en el repositorio.

## Qué hace

- `/cuenta`: la persona inicia sesión con Discord (`/cuenta/login`, 8 horas) y ve su panel con direcciones limpias, sin `#`: `/cuenta` (vista general), `/cuenta/personajes` (ficha privada), `/cuenta/economia` (vacía hasta conectar el juego), `/cuenta/perfil` (su cuenta) y `/cuenta/equipo` (solicitud «Únete al equipo»). Las direcciones antiguas con `#` se redirigen solas. La redirección de Discord sigue siendo `/acceso/callback`.
- `/acceso/`: solicitud de invitación a Discord con SteamID.
- `/admin/`: panel del equipo con usuario y contraseña propios.
  - **Usuarios**: cuentas, última conexión, progreso de la ficha, y un desplegable con lo que ha rellenado (ficha y solicitud al equipo; el apartado «Secretos» de la ficha no se muestra nunca), estado de la solicitud y SteamID. Permite eliminar una cuenta y todos sus datos.
  - **Solicitudes de acceso**: SteamID declarado y resultado.
  - **Equipo**: candidaturas con sus respuestas; se marcan como pendiente, aceptada o rechazada, y la persona ve el estado en su cuenta.

## Acceso del equipo y registro

- **Con Discord (recomendado):** el panel muestra «Entrar con Discord». Solo entran los identificadores de `ADMIN_DISCORD_IDS` (IDs de Discord separados por comas). Quitar un ID del `.env` y volver a desplegar cierra sus sesiones al instante. Reutiliza la aplicación de Discord y la redirección `/acceso/callback` que ya existen.
- **Con usuario y contraseña (alternativa):** `ADMIN_USERNAME` y `ADMIN_PASSWORD`. Para apagarla sin borrarla, `ADMIN_PASSWORD_LOGIN=off` y volver a desplegar.
- **Orden recomendado:** 1) añade tu ID de Discord a `ADMIN_DISCORD_IDS`; 2) `npm run admin:deploy`; 3) comprueba que entras con Discord; 4) pon `ADMIN_PASSWORD_LOGIN=off`, vuelve a desplegar y comprueba que la contraseña ya no funciona.
- **Registro** (`/admin/registro/`): quién entró y quién cambió el estado de una candidatura o eliminó una cuenta, candidatura o solicitud, con fecha. Se conserva 180 días y lo ve solo el equipo.

## Direcciones

Las tres rutas viven en `https://kiroshirp-admin.kiroshirp.workers.dev`. Las funciones de `functions/` las reenvían desde `https://kiroshirp.pages.dev` cuando el proyecto Pages tiene el enlace de servicio `PANEL` hacia `kiroshirp-admin`; sin él, redirigen al Worker. La redirección `https://kiroshirp.pages.dev/acceso/callback` debe estar añadida en la aplicación de Discord (la de workers.dev debe seguir).

## Archivo privado

Completa `.env` (excluido de Git; nunca lo envíes por chat). Campos: `ADMIN_DISCORD_IDS` y/o `ADMIN_USERNAME` y `ADMIN_PASSWORD` (13 caracteres o más) con `ADMIN_PASSWORD_LOGIN`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` (solo para desplegar), `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_BOT_TOKEN`, `DISCORD_INVITE_CHANNEL_ID`. `TURSO_DATABASE_URL` y `TURSO_AUTH_TOKEN` (base de datos; se suben como secretos al desplegar). `GITHUB_TOKEN` ya no hace falta; revoca el token en GitHub y bórralo del Worker con `npx wrangler secret delete GITHUB_TOKEN`.

## Desplegar

```bash
npm ci
npm run admin:test
npm run admin:deploy
```

`npm run admin:check` compila el Worker sin desplegarlo. El despliegue carga los secretos por entrada estándar, sin imprimirlos.

## Qué se guarda (Turso)

Los datos viven en una base Turso (tabla `kv`, clave y valor JSON) a la que el Worker accede por HTTP con `TURSO_DATABASE_URL` y `TURSO_AUTH_TOKEN`. El Durable Object solo serializa las peticiones y programa la limpieza horaria de lo caducado. Al primer arranque con Turso, copia a la base lo que hubiera en el Durable Object y lo borra de allí. Si Turso no responde, el panel contesta 503.

| Dato                                                | Caducidad                                    |
| --------------------------------------------------- | -------------------------------------------- |
| Cuenta: ID, nombre de Discord, alta y último acceso | hasta que la persona o el equipo la eliminen |
| Ficha de personaje (hasta 50.000 caracteres)        | hasta que se elimine                         |
| Solicitud del equipo (una por cuenta)               | 90 días                                      |
| Solicitud de acceso (SteamID)                       | 90 días                                      |
| Sesiones                                            | 8 horas (15 minutos en `/acceso/`)           |
| Registro de acciones del equipo                     | 180 días                                     |

«Eliminar mis datos», en Mi cuenta, y «Eliminar cuenta», en el panel, borran todo lo anterior.

## Seguridad

Las escrituras exigen origen propio y token CSRF; las cookies son `HttpOnly` y `__Host-`; el inicio de sesión del panel limita los intentos; los datos personales solo se devuelven con sesión de Discord y el panel exige además la contraseña del equipo; la CSP solo admite recursos del propio sitio. El equipo puede leer las fichas para moderar, salvo el apartado «Secretos»; el texto de la ficha lo advierte.
