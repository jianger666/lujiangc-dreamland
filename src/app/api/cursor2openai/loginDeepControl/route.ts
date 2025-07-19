import { NextRequest } from 'next/server';
import { apiHandler } from '@/lib/api/handler';

export const runtime = 'edge';

export const GET = apiHandler(async (request: NextRequest) => {
  const baseUrl = new URL(request.url).origin;
  const internalUrl = `${baseUrl}/api/cursor2openai/internal/loginDeepControl`;

  // 转发所有headers
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const response = await fetch(internalUrl, {
    method: 'GET',
    headers,
  });

  return response;
});
