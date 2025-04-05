import { NextRequest } from 'next/server';
import {
  createErrorResponse,
  createSuccessResponse,
  ApiResponse,
} from './response';
import { HttpStatus } from './httpStatus';

export type ApiHandler<T = unknown> = (
  req: NextRequest,
  params?: { params: Record<string, string> },
) => Promise<Response | T | ApiResponse<T>>;

/**
 * API路由处理包装器
 * 用于统一处理API路由的请求和响应格式
 *
 * @param handler API处理函数
 * @returns 包装后的处理函数
 *
 * @example
 * // 在route.ts中使用
 * export const GET = apiHandler(async (req) => {
 *   const data = await fetchData();
 *   return createSuccessResponse(data);
 * });
 */
export function apiHandler<T>(handler: ApiHandler<T>) {
  return async (
    req: NextRequest,
    params?: { params: Record<string, string> },
  ) => {
    try {
      const result = await handler(req, params);

      // 如果处理函数已经返回了Response对象，则直接返回
      if (result instanceof Response) {
        return result;
      }

      // 否则返回标准成功响应
      return createSuccessResponse({ data: result as T });
    } catch (error) {
      console.error('API请求处理错误:', error);

      // 返回统一的错误响应
      const message =
        error instanceof Error ? error.message : '服务器处理请求时出错';
      return createErrorResponse({
        message,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    }
  };
}
