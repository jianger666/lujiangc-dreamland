'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import httpClient from '@/lib/api/http';

interface User {
  id: number;
  name: string;
  email: string;
}

export function HttpClientExample() {
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 普通请求示例 - 会自动处理错误并显示toast提示
  const fetchUser = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await httpClient.get<User>('/api/users/1');
      setUserData(response.data);
    } catch {
      // 错误已经由HTTP客户端自动处理并显示toast，这里只需记录本地状态
      setError('获取用户数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 带自定义baseUrl的请求示例
  const fetchUserWithCustomBase = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await httpClient.get<User>(
        '/api/users/1',
        {},
        {
          baseUrl: 'https://api.example.com',
        },
      );
      setUserData(response.data);
    } catch {
      setError('获取用户数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 跳过错误处理的请求示例 - 自行处理错误响应
  const fetchUserSkipErrorHandler = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await httpClient.get<User>(
        '/api/users/1',
        {},
        {
          skipErrorHandler: true,
        },
      );
      setUserData(response.data);
    } catch (err) {
      // 手动处理错误，不会自动显示toast
      const error = err as {
        status?: number;
        statusText?: string;
        data?: { message?: string };
      };

      // 自定义错误处理逻辑
      if (error.status === 422) {
        setError(`请求参数错误: ${error.data?.message || '未知错误'}`);
      } else if (error.status === 0) {
        setError('网络连接错误，请检查您的网络');
      } else {
        setError(
          `请求失败 (${error.status}): ${error.data?.message || error.statusText || '未知错误'}`,
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">HTTP客户端示例</h1>

      <div className="flex gap-4">
        <Button onClick={fetchUser} disabled={loading}>
          {loading ? '加载中...' : '获取用户数据'}
        </Button>

        <Button
          onClick={fetchUserWithCustomBase}
          disabled={loading}
          variant="outline"
        >
          使用自定义baseUrl
        </Button>

        <Button
          onClick={fetchUserSkipErrorHandler}
          disabled={loading}
          variant="secondary"
        >
          跳过错误处理
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 rounded-md p-4 text-destructive">
          {error}
        </div>
      )}

      {userData && (
        <div className="rounded-md bg-muted p-4">
          <h2 className="mb-2 font-semibold">用户数据</h2>
          <pre className="overflow-auto whitespace-pre-wrap">
            {JSON.stringify(userData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
