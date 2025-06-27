import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api/handler';
import { v4 as uuidv4 } from 'uuid';
/* eslint-disable @typescript-eslint/no-require-imports */
const {
  generatePkcePair,
  queryAuthPoll,
} = require('../../tool/cursorLogin.js');

export const GET = apiHandler(async (request: NextRequest) => {
  const bearerToken = request.headers
    .get('authorization')
    ?.replace('Bearer ', '');
  const { verifier, challenge } = generatePkcePair();
  const uuid = uuidv4();

  await fetch('https://www.cursor.com/api/auth/loginDeepCallbackControl', {
    method: 'POST',
    headers: {
      Accept: '*/*',
      'Content-Type': 'application/json',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.6834.210 Safari/537.36',
      Cookie: `WorkosCursorSessionToken=${bearerToken}`,
    },
    body: JSON.stringify({
      uuid: uuid,
      challenge: challenge,
    }),
  });

  const retryAttempts = 20;
  for (let i = 0; i < retryAttempts; i++) {
    const data = await queryAuthPoll(uuid, verifier);
    if (data) {
      return NextResponse.json(data);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return NextResponse.json(
    {
      error: 'Get cookie timeout, please try again.',
    },
    { status: 500 },
  );
});
