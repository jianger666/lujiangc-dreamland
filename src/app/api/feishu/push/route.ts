import { NextRequest } from 'next/server';
import { getPairByCode, savePendingRequest } from '@/lib/services/feishu/store';
import { sendMessageByOpenId } from '@/lib/services/feishu/client';
import { apiHandler } from '@/lib/api/handler';

const API_SECRET = process.env.FEEDBACK_API_SECRET;

export const POST = apiHandler(async (request: NextRequest) => {
  const authHeader = request.headers.get('authorization');
  if (API_SECRET && authHeader !== `Bearer ${API_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { requestId, summary, pairCode } = await request.json();

  if (!requestId || !summary || !pairCode) {
    return Response.json(
      { error: 'Missing required fields: requestId, summary, pairCode' },
      { status: 400 }
    );
  }

  const pair = await getPairByCode(pairCode);
  if (!pair) {
    return Response.json(
      { error: 'Pair code not found. User needs to pair first.' },
      { status: 404 }
    );
  }

  await savePendingRequest(pair.feishuOpenId, {
    requestId,
    summary,
    pairCode,
    createdAt: Date.now(),
  });

  const header = '🤖 **Cursor AI 反馈请求**\n\n';
  const footer = '\n\n---\n直接回复此消息即可将反馈传回给 AI。';
  const messageContent = header + summary + footer;

  try {
    await sendMessageByOpenId(pair.feishuOpenId, messageContent);
    return Response.json({ ok: true, sent: true });
  } catch (error) {
    console.error('[Feishu Push] Failed to send message:', error);
    return Response.json(
      { ok: true, sent: false, error: 'Failed to send Feishu message' },
      { status: 200 }
    );
  }
});
