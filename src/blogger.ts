import { google, blogger_v3 } from 'googleapis';
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

function getBlogger(): blogger_v3.Blogger {
  return google.blogger({ version: 'v3', auth: getAuth() });
}

export async function publish({ title, contentHTML, labels, draft }: { title: string; contentHTML: string; labels: string[]; draft: boolean; }) {
  const blogger = getBlogger();
  try {
    const res = await blogger.posts.insert({
      blogId: process.env.BLOGGER_BLOG_ID!,
      requestBody: {
        title,
        content: contentHTML,
        labels,
      },
      isDraft: draft,
    });
    const postId = res.data.id!;
    let url = res.data.url || '';
    if (draft === false && res.data.status === 'DRAFT') {
      const published = await blogger.posts.publish({ blogId: process.env.BLOGGER_BLOG_ID!, postId });
      url = published.data.url || '';
    }
    return { postId, url };
  } catch (err) {
    logger.error({ err }, 'blogger publish failed');
    throw err;
  }
}
