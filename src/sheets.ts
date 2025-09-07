import { google, sheets_v4 } from 'googleapis';
import { logger } from './logger.js';

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

function getSheets(): sheets_v4.Sheets {
  return google.sheets({ version: 'v4', auth: getAuth() });
}

export async function lookupByUrl(url: string): Promise<boolean> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    range: 'Sheet1!E:E',
  });
  const rows = res.data.values || [];
  return rows.flat().includes(url);
}

export interface RowData {
  id: string;
  fecha_iso: string;
  fuente: string;
  titulo: string;
  url_fuente: string;
  resumen_md: string;
  comentario: string;
  status: string;
  blogger_post_id?: string;
  blogger_url?: string;
}

export async function appendRow(data: RowData) {
  const sheets = getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    range: 'Sheet1!A:J',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[
      data.id,
      data.fecha_iso,
      data.fuente,
      data.titulo,
      data.url_fuente,
      data.resumen_md,
      data.comentario,
      data.status,
      data.blogger_post_id || '',
      data.blogger_url || '',
    ]] },
  });
}

export async function updateStatus(id: string, status: string, extra: Partial<RowData> = {}) {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    range: 'Sheet1!A:A',
  });
  const rows = res.data.values || [];
  const rowIndex = rows.findIndex((r) => r[0] === id);
  if (rowIndex === -1) return;
  const rowNumber = rowIndex + 1;
  const updates = [status, extra.blogger_post_id || '', extra.blogger_url || ''];
  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    range: `Sheet1!H${rowNumber}:J${rowNumber}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[...updates]] },
  });
}

export async function getRowById(id: string): Promise<RowData | null> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    range: 'Sheet1!A:J',
  });
  const rows = res.data.values || [];
  for (const row of rows) {
    if (row[0] === id) {
      return {
        id: row[0],
        fecha_iso: row[1],
        fuente: row[2],
        titulo: row[3],
        url_fuente: row[4],
        resumen_md: row[5],
        comentario: row[6],
        status: row[7],
        blogger_post_id: row[8],
        blogger_url: row[9],
      };
    }
  }
  return null;
}
