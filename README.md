# rss-approve-publish

Pipeline en Node.js + TypeScript para leer fuentes RSS/HTML, traducir, resumir y publicar en Blogger tras aprobación editorial.

## Requisitos
- Node.js 20+
- Instancias locales de [Ollama](https://github.com/jmorganca/ollama) y [LibreTranslate](https://github.com/LibreTranslate/LibreTranslate)
- Credenciales Google (Sheets, Blogger y Gmail)
- Cuenta [Brevo](https://www.brevo.com/)

## Instalación
```bash
pnpm install
```

## Configuración
1. Copia `.env.example` a `.env` y completa las variables.
2. Copia `config.example.yaml` a `config.yaml` y ajusta feeds y opciones.

## Comandos
```bash
pnpm build      # compila TypeScript
pnpm start      # ejecuta cron (feeds + aprobaciones)
pnpm scan       # ejecuta una lectura de feeds
pnpm poll       # revisa respuestas de aprobación
pnpm test       # ejecuta pruebas
```

## Flujo
1. `scanFeeds()` descarga artículos, normaliza, traduce (opcional) y resume.
2. Se registran en Google Sheets con estado `pending` y se envía email de aprobación.
3. `pollGmailReplies()` detecta respuestas "sí/no". Al aprobar se publica en Blogger y se envía mailing con Brevo.
4. Alternativamente puede aprobarse mediante webhooks `/approve` y `/reject`.

## Notas
- El proyecto utiliza cron para ejecutar periódicamente `scanFeeds` y `pollGmailReplies`.
- Para publicar en Blogger y enviar emails se usan las APIs oficiales de Google.
- Las pruebas incluyen utilidades de slug y HMAC.

## Licencia
[MIT](./LICENSE)
