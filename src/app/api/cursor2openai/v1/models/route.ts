import { NextRequest } from 'next/server';
import { apiHandler } from '@/lib/api/handler';

export const runtime = 'edge';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export const OPTIONS = () =>
  new Response(null, { status: 204, headers: corsHeaders });

export const GET = apiHandler(async (request: NextRequest) => {
  const baseUrl = new URL(request.url).origin;
  const internalUrl = `${baseUrl}/api/cursor2openai/internal/chat/completions`;

  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const response = await fetch(internalUrl, {
    method: 'GET',
    headers,
  });

  const newHeaders = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([k, v]) => newHeaders.set(k, v));

  return new Response(response.body, {
    status: response.status,
    headers: newHeaders,
  });
});
