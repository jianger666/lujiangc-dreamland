import { NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api/handler';

/* eslint-disable @typescript-eslint/no-require-imports */
const { generatePkcePair } = require('../../tool/cursorLogin.js');
const { v4: uuidv4 } = require('uuid');
/* eslint-enable @typescript-eslint/no-require-imports */

export const maxDuration = 60;

export const GET = apiHandler(async () => {
  const { verifier, challenge } = generatePkcePair();
  const uuid = uuidv4();
  const loginUrl = `https://www.cursor.com/loginDeepControl?challenge=${challenge}&uuid=${uuid}&mode=login`;

  return NextResponse.json({
    loginUrl,
    uuid,
    verifier,
    message:
      '请在浏览器中打开 loginUrl 进行登录，登录完成后用 uuid 和 verifier 调用 /auth/poll 接口获取 Token',
  });
});
