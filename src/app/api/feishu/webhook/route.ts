import { NextRequest } from 'next/server';
import {
  getPairByUser,
  getPendingRequest,
  savePair,
  saveReply,
} from '@/lib/services/feishu/store';
import { sendTextMessage } from '@/lib/services/feishu/client';

const VERIFICATION_TOKEN = process.env.FEISHU_VERIFICATION_TOKEN;

const processedEvents = new Set<string>();

export async function POST(request: NextRequest) {
  const body = await request.json();

  // URL verification challenge
  if (body.type === 'url_verification') {
    return Response.json({ challenge: body.challenge });
  }

  // Verify token if configured
  if (VERIFICATION_TOKEN && body.header?.token !== VERIFICATION_TOKEN) {
    return Response.json({ error: 'Invalid token' }, { status: 403 });
  }

  const eventId = body.header?.event_id;
  if (eventId && processedEvents.has(eventId)) {
    return Response.json({ ok: true });
  }
  if (eventId) {
    processedEvents.add(eventId);
    setTimeout(() => processedEvents.delete(eventId), 60_000);
  }

  const eventType = body.header?.event_type;

  if (eventType === 'im.message.receive_v1') {
    await handleMessageReceive(body.event);
  }

  return Response.json({ ok: true });
}

async function handleMessageReceive(event: any) {
  const sender = event.sender?.sender_id?.open_id;
  const message = event.message;
  if (!sender || !message) return;

  const msgType = message.message_type;
  const chatId = message.chat_id;

  let textContent = '';
  try {
    const content = JSON.parse(message.content || '{}');
    if (msgType === 'text') {
      textContent = content.text || '';
    }
  } catch {
    return;
  }

  // Handle pair command
  const pairMatch = textContent.match(/^\/pair\s+(\S+)/i) || textContent.match(/^CF-(\S+)/i);
  if (pairMatch) {
    const code = textContent.startsWith('/pair') ? pairMatch[1] : `CF-${pairMatch[1]}`;
    await savePair(code, {
      feishuOpenId: sender,
      chatId,
      createdAt: Date.now(),
    });
    await sendTextMessage(chatId, `✅ 绑定成功！配对码: ${code}\n\n之后 Cursor AI 的反馈消息会发送到这里，你可以直接回复。`);
    return;
  }

  // Handle reply to pending request
  const userInfo = await getPairByUser(sender);
  if (!userInfo) {
    await sendTextMessage(
      chatId,
      '👋 欢迎使用 Cursor Feedback！\n\n请在 Cursor 扩展中获取配对码，然后发送：\n/pair CF-XXXXXX'
    );
    return;
  }

  const pending = await getPendingRequest(sender);
  if (!pending) {
    await sendTextMessage(chatId, '当前没有待回复的反馈请求。AI 下次提问时会发送到这里。');
    return;
  }

  await saveReply(pending.requestId, {
    content: textContent,
    repliedAt: Date.now(),
  });

  await sendTextMessage(chatId, '✅ 已收到回复，正在传回给 Cursor AI...');
}
