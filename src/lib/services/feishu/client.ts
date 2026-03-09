const FEISHU_APP_ID = process.env.FEISHU_APP_ID!;
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET!;
const FEISHU_BASE_URL = 'https://open.feishu.cn/open-apis';

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getTenantAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const res = await fetch(
    `${FEISHU_BASE_URL}/auth/v3/tenant_access_token/internal`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: FEISHU_APP_ID,
        app_secret: FEISHU_APP_SECRET,
      }),
    }
  );

  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`Failed to get tenant token: ${data.msg}`);
  }

  cachedToken = {
    token: data.tenant_access_token,
    expiresAt: Date.now() + (data.expire - 300) * 1000,
  };

  return cachedToken.token;
}

export interface FeishuRichTextElement {
  tag: string;
  text?: string;
  href?: string;
  style?: string[];
}

export interface FeishuRichTextLine {
  elements: FeishuRichTextElement[];
}

function markdownToRichText(
  markdown: string
): Record<string, { title: string; content: FeishuRichTextLine[][] }> {
  const lines = markdown.split('\n');
  const content: FeishuRichTextLine[][] = [];
  let title = '';

  for (const line of lines) {
    const h1Match = line.match(/^#\s+(.+)/);
    if (h1Match && !title) {
      title = h1Match[1];
      continue;
    }

    const h2Match = line.match(/^##\s+(.+)/);
    if (h2Match) {
      content.push([
        { elements: [{ tag: 'text', text: h2Match[1], style: ['bold'] }] },
      ]);
      continue;
    }

    const h3Match = line.match(/^###\s+(.+)/);
    if (h3Match) {
      content.push([
        { elements: [{ tag: 'text', text: h3Match[1], style: ['bold'] }] },
      ]);
      continue;
    }

    if (line.trim() === '') {
      continue;
    }

    const elements: FeishuRichTextElement[] = [];
    const remaining = line;

    // **bold** and `code` and [link](url)
    const inlineRegex = /\*\*(.+?)\*\*|`(.+?)`|\[(.+?)\]\((.+?)\)/g;
    let lastIndex = 0;
    let match;

    while ((match = inlineRegex.exec(remaining)) !== null) {
      if (match.index > lastIndex) {
        elements.push({
          tag: 'text',
          text: remaining.slice(lastIndex, match.index),
        });
      }
      if (match[1]) {
        elements.push({ tag: 'text', text: match[1], style: ['bold'] });
      } else if (match[2]) {
        elements.push({ tag: 'text', text: `\`${match[2]}\`` });
      } else if (match[3] && match[4]) {
        elements.push({ tag: 'a', text: match[3], href: match[4] });
      }
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < remaining.length) {
      elements.push({ tag: 'text', text: remaining.slice(lastIndex) });
    }

    if (elements.length > 0) {
      content.push([{ elements }]);
    }
  }

  return { zh_cn: { title, content } };
}

export async function sendRichTextMessage(
  chatId: string,
  markdown: string
): Promise<void> {
  const token = await getTenantAccessToken();
  const post = markdownToRichText(markdown);

  const res = await fetch(
    `${FEISHU_BASE_URL}/im/v1/messages?receive_id_type=chat_id`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        receive_id: chatId,
        msg_type: 'post',
        content: JSON.stringify({ ...post }),
      }),
    }
  );

  const data = await res.json();
  if (data.code !== 0) {
    console.error('[Feishu] Send message failed:', data);
    throw new Error(`Failed to send message: ${data.msg}`);
  }
}

export async function sendTextMessage(
  chatId: string,
  text: string
): Promise<void> {
  const token = await getTenantAccessToken();

  const res = await fetch(
    `${FEISHU_BASE_URL}/im/v1/messages?receive_id_type=chat_id`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        receive_id: chatId,
        msg_type: 'text',
        content: JSON.stringify({ text }),
      }),
    }
  );

  const data = await res.json();
  if (data.code !== 0) {
    console.error('[Feishu] Send text message failed:', data);
    throw new Error(`Failed to send text message: ${data.msg}`);
  }
}

export async function getChatIdByUserId(userId: string): Promise<string> {
  const token = await getTenantAccessToken();

  const res = await fetch(
    `${FEISHU_BASE_URL}/im/v1/chats?user_id_type=open_id`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        user_id: userId,
      }),
    }
  );

  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`Failed to get chat_id: ${data.msg}`);
  }

  return data.data.chat_id;
}

export async function sendMessageByOpenId(
  openId: string,
  markdown: string
): Promise<void> {
  const token = await getTenantAccessToken();
  const post = markdownToRichText(markdown);

  const res = await fetch(
    `${FEISHU_BASE_URL}/im/v1/messages?receive_id_type=open_id`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        receive_id: openId,
        msg_type: 'post',
        content: JSON.stringify({ ...post }),
      }),
    }
  );

  const data = await res.json();
  if (data.code !== 0) {
    console.error('[Feishu] Send message by open_id failed:', data);
    throw new Error(`Failed to send message: ${data.msg}`);
  }
}
