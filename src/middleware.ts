import { NextRequest, NextResponse } from "next/server";
import { generateUUID } from "@/lib";

/**
 * 中间件配置 - 只处理API路由
 */
export const config = {
  matcher: "/api/:path*",
};

/**
 * Next.js API中间件
 * 用于统一处理API请求的日志记录、认证和CORS等
 */
export async function middleware(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const { pathname } = requestUrl;

  console.log(`[API请求] ${request.method} ${pathname}`);

  // 添加公共响应头
  const response = NextResponse.next();

  // 添加请求ID
  const requestId = generateUUID();
  response.headers.set("x-request-id", requestId);

  // 记录API完成时间
  response.headers.set("x-request-completed", new Date().toISOString());

  // 注释掉先，只允许同源
  // response.headers.set('Access-Control-Allow-Origin', '*');

  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization",
  );

  // 若为预检请求则直接返回
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: response.headers,
    });
  }

  return response;
}
