import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api/handler';

/* eslint-disable @typescript-eslint/no-require-imports */
const { queryAuthPoll } = require('../../tool/cursorLogin.js');
/* eslint-enable @typescript-eslint/no-require-imports */

export const maxDuration = 60;

export const GET = apiHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const uuid = searchParams.get('uuid');
  const verifier = searchParams.get('verifier');

  if (!uuid || !verifier) {
    return NextResponse.json(
      { error: '缺少 uuid 或 verifier 参数' },
      { status: 400 }
    );
  }

  for (let i = 0; i < 12; i++) {
    const data = await queryAuthPoll(uuid, verifier);
    if (data) {
      const accessToken = data.accessToken || undefined;
      const authId = data.authId || '';
      let token: string | undefined;
      if (authId.split('|').length > 1) {
        const userId = authId.split('|')[1];
        token = `${userId}%3A%3A${accessToken}`;
      } else {
        token = accessToken;
      }
      return NextResponse.json({
        token,
        message:
          '登录成功！使用此 Token 作为 API Key 调用 /v1/chat/completions',
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  return NextResponse.json(
    {
      error: '等待登录超时，请重新调用 /auth/login 获取新的登录链接',
      status: 'timeout',
    },
    { status: 408 }
  );
});
