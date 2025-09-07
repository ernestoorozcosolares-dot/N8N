import { google, gmail_v1 } from 'googleapis';
import type { Config } from './config.js';
import { verifyHmac } from './utils.js';
import { getRowById, updateStatus } from './sheets.js';
import { publish } from './blogger.js';
import { sendMailing } from './email.js';
import { marked } from 'marked';

function getAuth() {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oAuth2Client.setCredentials({
    access_token: process.env.GOOGLE_ACCESS_TOKEN,
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });
  return oAuth2Client;
}

function getGmail(): gmail_v1.Gmail {
  return google.gmail({ version: 'v1', auth: getAuth() });
}

export async function publishAndMail(id: string, config: Config) {
  const row = await getRowById(id);
  if (!row) return;
  const contentHTML = `<h2>Resumen</h2>${marked.parse(row.resumen_md)}<p><strong>Comentario:</strong> ${row.comentario}</p><p>Fuente: <a href="${row.url_fuente}" rel="nofollow noopener" target="_blank">${row.titulo}</a></p>`;
  const { postId, url } = await publish({ title: row.titulo, contentHTML, labels: config.destinations.blogger.labels, draft: config.destinations.blogger.draft });
  await updateStatus(id, 'published', { blogger_post_id: postId, blogger_url: url });
  const mailingHtml = `<h1>${row.titulo}</h1>${marked.parse(row.resumen_md)}<p><a href="${url}">Leer en Blogger</a></p>`;
  await sendMailing(`${config.destinations.email_list.subjectPrefix}: ${row.titulo}`, mailingHtml, config);
}

export async function pollGmailReplies(config: Config) {
  const gmail = getGmail();
  const res = await gmail.users.messages.list({ userId: 'me', q: 'is:unread subject:"[APPROVAL:"' });
  const messages = res.data.messages || [];
  for (const m of messages) {
    const msg = await gmail.users.messages.get({ userId: 'me', id: m.id!, format: 'full' });
    const subjectHeader = msg.data.payload?.headers?.find((h) => h.name === 'Subject')?.value || '';
    const idMatch = subjectHeader.match(/\[APPROVAL: (\w+)\]/);
    const id = idMatch ? idMatch[1] : undefined;
    const body = Buffer.from(msg.data.payload?.parts?.find((p) => p.mimeType === 'text/plain')?.body?.data || '', 'base64').toString('utf8');
    const bodyLower = body.toLowerCase();
    if (!id) continue;
    if (bodyLower.includes('si') || bodyLower.includes('yes') || bodyLower.includes('aprobar')) {
      await publishAndMail(id, config);
      await updateStatus(id, 'approved');
    } else if (bodyLower.includes('no') || bodyLower.includes('rechazar')) {
      await updateStatus(id, 'rejected');
    }
    await gmail.users.messages.modify({ userId: 'me', id: m.id!, requestBody: { removeLabelIds: ['UNREAD'] } });
  }
}

export function validateWebhook(id: string, token: string): boolean {
  return verifyHmac(id, token, process.env.APPROVAL_SECRET!);
}
