import { google, gmail_v1 } from 'googleapis';
import axios from 'axios';
import { hmac } from './utils.js';
import type { Config } from './config.js';

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

function buildMessage(to: string, subject: string, html: string, from = process.env.GMAIL_SENDER!) {
  const message = [`To: ${to}`, `From: ${from}`, `Subject: ${subject}`, 'Content-Type: text/html; charset=UTF-8', '', html].join('\n');
  return Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
}

export async function sendApprovalEmail(id: string, title: string, summary: string, bullets: string[], comentario: string, sourceUrl: string, config: Config) {
  const gmail = getGmail();
  const approveLinks = config.approval.method === 'webhook'
    ? `<p><a href="${config.approval.webhook.approve_url}?id=${id}&token=${hmac(id, process.env.APPROVAL_SECRET!)}">Aprobar</a> | <a href="${config.approval.webhook.reject_url}?id=${id}&token=${hmac(id, process.env.APPROVAL_SECRET!)}">Rechazar</a></p>`
    : '<p>Responde "sí" o "no" a este correo para aprobar o rechazar.</p>';
  const html = `<h1>${title}</h1><p>${summary}</p><ul>${bullets.map((b) => `<li>${b}</li>`).join('')}</ul><p><strong>Comentario:</strong> ${comentario}</p><p>Fuente: <a href="${sourceUrl}" rel="nofollow">${sourceUrl}</a></p>${approveLinks}`;
  const subject = `${config.approval.email_subject_prefix}: [APPROVAL: ${id}] ${title}`;
  const raw = buildMessage(process.env.GMAIL_EDITOR!, subject, html);
  await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
}

export async function sendMailing(subject: string, html: string, config: Config) {
  if (!config.destinations.email_list.enabled) return;
  const data: any = {
    sender: { name: process.env.MAIL_FROM?.split(' ')[0], email: process.env.MAIL_FROM?.split(' ').slice(-1)[0] },
    subject,
    htmlContent: html,
  };
  if (config.destinations.email_list.useBrevoListId) {
    data.listIds = [Number(process.env.BREVO_LIST_ID)];
  } else {
    data.to = process.env.MAIL_RECIPIENTS!.split(',').map((e) => ({ email: e.trim() }));
  }
  await axios.post('https://api.brevo.com/v3/smtp/email', data, {
    headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json' },
  });
}
