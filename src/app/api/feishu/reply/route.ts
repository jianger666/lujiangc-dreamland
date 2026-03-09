import { NextRequest } from 'next/server';
import { consumeReply } from '@/lib/services/feishu/store';
import { apiHandler } from '@/lib/api/handler';

const API_SECRET = process.env.FEEDBACK_API_SECRET;

export const GET = apiHandler(async (request: NextRequest) => {
  const authHeader = request.headers.get('authorization');
  if (API_SECRET && authHeader !== `Bearer ${API_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const requestId = request.nextUrl.searchParams.get('requestId');
  if (!requestId) {
    return Response.json(
      { error: 'Missing requestId parameter' },
      { status: 400 }
    );
  }

  const reply = await consumeReply(requestId);

  if (!reply) {
    return Response.json({ status: 'pending', reply: null });
  }

  return Response.json({ status: 'replied', reply });
});
