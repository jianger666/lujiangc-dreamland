'use client';

import { getStatusMessage, HttpStatus } from '../httpStatus';
import { toast } from '@/hooks/use-toast';
import { ApiResponse } from '../response';

/**
 * 请求取消映射
 */
const abortControllers: Record<string, AbortController> = {};

/**
 * 基础JSON数据类型定义
 */
export type JsonPrimitive = string | number | boolean | null | undefined;
export interface JsonObject {
  [key: string]: JsonPrimitive | JsonObject | JsonArray;
}
export type JsonArray = Array<JsonPrimitive | JsonObject | JsonArray>;
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;

/**
 * 生成请求唯一标识符
 * @param method 请求方法
 * @param url 请求URL
 * @param params 请求参数
 * @param data 请求数据
 */
const generateRequestKey = ({
  method,
  url,
  params,
  data,
}: {
  method: string;
  url: string;
  params?: Record<string, JsonValue>;
  data?: unknown;
}): string => {
  return `${method}:${url}:${JSON.stringify(params || {})}:${JSON.stringify(data || {})}`;
};

/**
 * HTTP客户端配置选项
 */
export interface HttpClientOptions {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

/**
 * 请求配置
 */
export interface RequestConfig<D = unknown> {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  params?: Record<string, JsonValue>;
  data?: D;
  timeout?: number;
  cancelPrevious?: boolean;
  retry?: number;
  retryDelay?: number;
  baseUrl?: string; // 可以覆盖实例的baseURL
  skipErrorHandler?: boolean; // 跳过错误处理
  extractData?: boolean; // 是否从响应中提取data.data，默认为true
}

export interface APIErrorResponse {
  status: number;
  statusText: string;
  response: ApiResponse;
}

/**
 * HTTP客户端类
 */
export class HttpClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private timeout: number;

  constructor(options: HttpClientOptions = {}) {
    this.baseURL = options.baseURL || '';
    this.timeout = options.timeout || 30000;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };
  }

  /**
   * 发送请求
   * @param config 请求配置
   */
  async request<T = unknown, D = unknown>(
    config: RequestConfig<D>
  ): Promise<T> {
    const {
      url,
      method,
      headers = {},
      params,
      data,
      timeout = this.timeout,
      cancelPrevious = false,
      retry = 0,
      retryDelay = 1000,
      baseUrl,
      skipErrorHandler = false,
      extractData = true,
    } = config;

    // 构建完整URL，优先使用传入的baseUrl
    const fullURL = this.buildURL(url, params, baseUrl);

    // 生成请求键
    const requestKey = generateRequestKey({ method, url, params, data });

    // 如果需要取消之前的相同请求
    if (cancelPrevious && abortControllers[requestKey]) {
      abortControllers[requestKey].abort('Canceled due to duplicate request');
    }

    // 创建新的AbortController
    const controller = new AbortController();
    if (cancelPrevious) {
      abortControllers[requestKey] = controller;
    }

    // 构建请求选项
    const requestOptions: RequestInit = {
      method,
      headers: {
        ...this.defaultHeaders,
        ...headers,
      },
      signal: controller.signal,
    };

    // 添加请求体（仅对非GET请求）
    if (method !== 'GET' && data !== undefined) {
      requestOptions.body =
        typeof data === 'object' ? JSON.stringify(data) : String(data);
    }

    try {
      // 请求拦截处理
      const newRequestOptions = await this.requestInterceptor(requestOptions);

      // 创建AbortTimeout
      const timeoutId = setTimeout(() => {
        controller.abort('Timeout of ' + timeout + 'ms exceeded');
      }, timeout);

      // 发送请求
      const response = await fetch(fullURL, newRequestOptions);

      // 清除超时
      clearTimeout(timeoutId);

      // 清除AbortController引用
      if (cancelPrevious) {
        delete abortControllers[requestKey];
      }

      // 响应拦截处理
      return this.responseInterceptor<T>(
        response,
        skipErrorHandler,
        extractData
      );
    } catch (error) {
      // 清除AbortController引用
      if (cancelPrevious) {
        delete abortControllers[requestKey];
      }

      // 重试处理
      if (
        retry > 0 &&
        !(error instanceof DOMException && error.name === 'AbortError')
      ) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        return this.request<T, D>({
          ...config,
          retry: retry - 1,
          retryDelay: retryDelay * 2, // 指数退避策略
        });
      }

      return this.errorHandler<T>(error, skipErrorHandler);
    }
  }

  /**
   * GET请求
   * @param url 请求URL
   * @param params 请求参数
   * @param config 其他配置
   */
  async get<T = unknown>(
    url: string,
    params?: Record<string, JsonValue>,
    config?: Partial<RequestConfig<undefined>>
  ): Promise<T> {
    return this.request<T, undefined>({
      method: 'GET',
      url,
      params,
      ...(config || {}),
    });
  }

  /**
   * POST请求
   * @param url 请求URL
   * @param data 请求数据
   * @param config 其他配置
   */
  async post<T = unknown, D = unknown>(
    url: string,
    data?: D,
    config?: Partial<RequestConfig<D>>
  ): Promise<T> {
    return this.request<T, D>({
      method: 'POST',
      url,
      data,
      ...(config || {}),
    });
  }

  /**
   * PUT请求
   * @param url 请求URL
   * @param data 请求数据
   * @param config 其他配置
   */
  async put<T = unknown, D = unknown>(
    url: string,
    data?: D,
    config?: Partial<RequestConfig<D>>
  ): Promise<T> {
    return this.request<T, D>({
      method: 'PUT',
      url,
      data,
      ...(config || {}),
    });
  }

  /**
   * DELETE请求
   * @param url 请求URL
   * @param params 请求参数
   * @param config 其他配置
   */
  async delete<T = unknown>(
    url: string,
    params?: Record<string, JsonValue>,
    config?: Partial<RequestConfig<undefined>>
  ): Promise<T> {
    return this.request<T, undefined>({
      method: 'DELETE',
      url,
      params,
      ...(config || {}),
    });
  }

  /**
   * 取消所有正在进行的请求
   */
  cancelAll(): void {
    Object.values(abortControllers).forEach((controller) => {
      controller.abort('User cancelled all requests');
    });
  }

  /**
   * 构建完整URL
   * @param url 相对URL
   * @param params 查询参数
   * @param customBaseUrl 自定义基础URL
   */
  private buildURL(
    url: string,
    params?: Record<string, JsonValue>,
    customBaseUrl?: string
  ): string {
    // 构建基础URL
    const baseURL = customBaseUrl !== undefined ? customBaseUrl : this.baseURL;
    let fullURL = url.startsWith('http') ? url : `${baseURL}${url}`;

    // 添加查询参数
    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });

      const queryString = searchParams.toString();
      if (queryString) {
        fullURL += (fullURL.includes('?') ? '&' : '?') + queryString;
      }
    }

    return fullURL;
  }

  /**
   * 请求拦截器
   * @param config 请求配置
   */
  private async requestInterceptor(config: RequestInit): Promise<RequestInit> {
    // 在这里添加请求拦截逻辑，比如添加认证信息
    // 示例: 从localStorage获取token并添加到请求头
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token && config.headers) {
        (config.headers as Record<string, string>)['Authorization'] =
          `Bearer ${token}`;
      }
    }

    return config;
  }

  /**
   * 响应拦截器
   * @param response 响应对象
   * @param skipErrorHandler 是否跳过错误处理
   * @param extractData 是否提取data.data
   */
  private async responseInterceptor<T>(
    response: Response,
    skipErrorHandler = false,
    extractData = true
  ): Promise<T> {
    // 处理不同的响应状态
    if (!response.ok) {
      // 解析错误响应

      const errorData = await response.json();

      // 如果skipErrorHandler为false，则进行错误提示
      if (!skipErrorHandler) {
        await this.handleHttpError(response.status, errorData);
      }

      return Promise.reject({
        status: response.status,
        statusText: response.statusText,
        response: errorData,
      });
    }

    // 解析响应内容
    let responseBody: unknown;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      responseBody = await response.json();
    } else {
      responseBody = await response.text();
    }

    // 根据extractData选项决定是否提取data.data
    let data: T;
    if (
      extractData &&
      responseBody &&
      typeof responseBody === 'object' &&
      responseBody !== null &&
      'data' in responseBody
    ) {
      data = (responseBody as Record<string, unknown>).data as T;
    } else {
      data = responseBody as T;
    }

    // 直接返回数据
    return data;
  }

  /**
   * 处理HTTP错误
   * @param status HTTP状态码
   * @param errorData 错误数据
   * @param statusText 状态文本
   */
  private async handleHttpError(
    status: number,
    errorData: Record<string, unknown>
  ): Promise<void> {
    // 处理特定状态码
    if (status === HttpStatus.UNAUTHORIZED) {
      // 登录过期或未授权处理
      if (typeof window !== 'undefined') {
        // 清除本地存储的token
        localStorage.removeItem('auth_token');

        // 显示未授权提示
        toast({
          variant: 'destructive',
          title: '认证失败',
          description: '您的登录已过期，请重新登录',
        });

        // 可以重定向到登录页
        // window.location.href = '/login';
      }
    } else if (status === HttpStatus.UNPROCESSABLE_ENTITY) {
      // 422错误，显示响应中的message
      const message = errorData.message
        ? String(errorData.message)
        : '请求参数有误';

      toast({
        variant: 'destructive',
        title: '请求失败',
        description: message,
      });
    } else if (status >= 500) {
      // 服务器错误
      toast({
        variant: 'destructive',
        title: '服务器错误',
        description: `服务器处理请求失败 (${status})`,
      });
    } else {
      // 其他错误
      toast({
        variant: 'destructive',
        title: '请求失败',
        description: errorData.message
          ? String(errorData.message)
          : getStatusMessage(status) || '请求处理失败',
      });
    }
  }

  /**
   * 错误处理
   * @param error 错误对象
   * @param skipErrorHandler 是否跳过错误处理
   */
  private errorHandler<T>(
    error: unknown,
    skipErrorHandler = false
  ): Promise<T> {
    // 错误类型断言
    const err = error as {
      status?: number;
      statusText?: string;
      data?: Record<string, unknown>;
      message?: string;
    };

    // 如果skipErrorHandler为true，则直接返回错误，不进行处理
    if (skipErrorHandler) {
      return Promise.reject(error);
    }

    // 检查是否是取消请求导致的错误
    if (error instanceof DOMException && error.name === 'AbortError') {
      // 请求被取消，通常不需要显示错误提示

      return Promise.reject({
        status: HttpStatus.CLIENT_CLOSED_REQUEST,
        statusText: getStatusMessage(HttpStatus.CLIENT_CLOSED_REQUEST),
        response: {
          data: null,
          message:
            error.message || getStatusMessage(HttpStatus.CLIENT_CLOSED_REQUEST),
          success: false,
        },
      });
    }

    // 这里只处理其他类型的错误
    if (!err.status) {
      toast({
        variant: 'destructive',
        description: err.message || '请求处理失败',
      });
    }

    return Promise.reject({
      status: HttpStatus.UNKNOWN,
      statusText: getStatusMessage(HttpStatus.UNKNOWN),
      response: {
        data: null,
        message: err.message || getStatusMessage(HttpStatus.UNKNOWN),
        success: false,
      },
    });
  }
}

// 导出默认实例
export const httpClient = new HttpClient({
  baseURL: typeof window !== 'undefined' ? window.location.origin : '',
  timeout: 30000,
});
