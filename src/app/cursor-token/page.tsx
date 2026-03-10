'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

type AuthState =
  | 'idle'
  | 'loading'
  | 'waiting'
  | 'success'
  | 'error'
  | 'timeout';

interface ModelItem {
  id: string;
  owned_by: string;
}

export default function CursorTokenPage() {
  const [state, setState] = useState<AuthState>('idle');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [models, setModels] = useState<ModelItem[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const fetchModels = useCallback(async (authToken: string) => {
    setModelsLoading(true);
    try {
      const res = await fetch('/api/cursor2openai/v1/models', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.data) setModels(data.data);
    } catch {
      /* ignore */
    } finally {
      setModelsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (state === 'success' && token) {
      fetchModels(token);
    }
  }, [state, token, fetchModels]);

  const handleLogin = useCallback(async () => {
    setState('loading');
    setError('');
    setToken('');
    setModels([]);

    try {
      const res = await fetch('/api/cursor2openai/auth/login');
      const data = await res.json();

      if (!data.loginUrl) {
        throw new Error(data.error || '获取登录链接失败');
      }

      window.open(data.loginUrl, '_blank');
      setState('waiting');

      abortRef.current = new AbortController();
      const maxAttempts = 60;
      for (let i = 0; i < maxAttempts; i++) {
        if (abortRef.current.signal.aborted) return;
        await new Promise((r) => setTimeout(r, 3000));
        if (abortRef.current.signal.aborted) return;

        try {
          const pollRes = await fetch(
            `/api/cursor2openai/auth/poll?uuid=${data.uuid}&verifier=${data.verifier}`,
            { signal: abortRef.current.signal }
          );
          const pollData = await pollRes.json();

          if (pollData.token) {
            setToken(pollData.token);
            setState('success');
            return;
          }
          if (pollData.status === 'timeout') continue;
        } catch {
          if (abortRef.current.signal.aborted) return;
        }
      }

      setState('timeout');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '未知错误');
      setState('error');
    }
  }, []);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [token]);

  const handleReset = useCallback(() => {
    abortRef.current?.abort();
    setState('idle');
    setToken('');
    setError('');
    setModels([]);
  }, []);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <div className="rounded-2xl border border-gray-700 bg-gray-800/80 p-8 shadow-2xl backdrop-blur-sm">
            <h1 className="mb-2 text-center text-3xl font-bold text-white">
              Cursor API Token
            </h1>
            <p className="mb-8 text-center text-gray-400">
              获取你的 Cursor Token，用于调用 AI API
            </p>

            {state === 'idle' && (
              <div className="space-y-6">
                <button
                  onClick={handleLogin}
                  className="w-full rounded-xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white transition-all hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.98]"
                >
                  登录 Cursor 获取 Token
                </button>
                <div className="rounded-xl border border-gray-700 bg-gray-900/50 p-5">
                  <h3 className="mb-3 text-sm font-medium text-gray-300">
                    使用说明
                  </h3>
                  <ol className="space-y-2 text-sm text-gray-400">
                    <li>1. 点击上方按钮，会跳转到 Cursor 官网登录</li>
                    <li>2. 用你自己的 Cursor 账号完成登录</li>
                    <li>3. 登录成功后回到此页面，Token 会自动显示</li>
                    <li>4. 复制 Token 用于 API 调用</li>
                  </ol>
                </div>
              </div>
            )}

            {state === 'loading' && (
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
                <p className="text-gray-300">正在生成登录链接...</p>
              </div>
            )}

            {state === 'waiting' && (
              <div className="space-y-6">
                <div className="flex flex-col items-center gap-4 py-4">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-yellow-500 border-t-transparent" />
                  <p className="text-lg text-yellow-300">
                    等待你在新窗口中完成登录...
                  </p>
                  <p className="text-sm text-gray-400">
                    已打开 Cursor 登录页面，请在新标签页中完成登录
                  </p>
                </div>
                <button
                  onClick={handleReset}
                  className="w-full rounded-xl border border-gray-600 px-6 py-3 text-gray-300 transition-colors hover:border-gray-500 hover:text-white"
                >
                  取消
                </button>
              </div>
            )}

            {state === 'success' && (
              <div className="space-y-6">
                <div className="rounded-xl border border-green-800 bg-green-900/30 p-4 text-center">
                  <p className="text-lg font-medium text-green-300">
                    登录成功！
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">
                    你的 Cursor Token
                  </label>
                  <div className="relative">
                    <textarea
                      readOnly
                      value={token}
                      rows={3}
                      className="w-full resize-none rounded-xl border border-gray-600 bg-gray-900 p-4 font-mono text-sm text-gray-200 focus:border-blue-500 focus:outline-none"
                    />
                    <button
                      onClick={handleCopy}
                      className="absolute right-3 top-3 rounded-lg bg-gray-700 px-3 py-1.5 text-xs text-gray-300 transition-colors hover:bg-gray-600 hover:text-white"
                    >
                      {copied ? '已复制!' : '复制'}
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-700 bg-gray-900/50 p-5">
                  <h3 className="mb-3 text-sm font-medium text-gray-300">
                    如何使用
                  </h3>
                  <div className="space-y-3 text-sm text-gray-400">
                    <p>
                      <span className="font-medium text-gray-300">
                        API Base URL:
                      </span>{' '}
                      <code className="rounded bg-gray-800 px-2 py-0.5 text-blue-400">
                        {typeof window !== 'undefined'
                          ? `${window.location.origin}/api/cursor2openai/v1`
                          : '/api/cursor2openai/v1'}
                      </code>
                    </p>
                    <p>
                      <span className="font-medium text-gray-300">
                        API Key:
                      </span>{' '}
                      上方的 Token
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-700 bg-gray-900/50 p-5">
                  <h3 className="mb-3 text-sm font-medium text-gray-300">
                    可用模型（{models.length}）
                  </h3>
                  {modelsLoading ? (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                      加载模型列表...
                    </div>
                  ) : models.length > 0 ? (
                    <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto">
                      {models.map((m) => (
                        <span
                          key={m.id}
                          className="rounded-lg bg-gray-800 px-2.5 py-1 font-mono text-xs text-gray-300"
                        >
                          {m.id}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">暂无模型数据</p>
                  )}
                </div>

                <button
                  onClick={handleReset}
                  className="w-full rounded-xl border border-gray-600 px-6 py-3 text-gray-300 transition-colors hover:border-gray-500 hover:text-white"
                >
                  重新获取
                </button>
              </div>
            )}

            {state === 'error' && (
              <div className="space-y-6">
                <div className="rounded-xl border border-red-800 bg-red-900/30 p-4 text-center">
                  <p className="text-red-300">{error}</p>
                </div>
                <button
                  onClick={handleReset}
                  className="w-full rounded-xl bg-blue-600 px-6 py-3 text-white hover:bg-blue-500"
                >
                  重试
                </button>
              </div>
            )}

            {state === 'timeout' && (
              <div className="space-y-6">
                <div className="rounded-xl border border-yellow-800 bg-yellow-900/30 p-4 text-center">
                  <p className="text-yellow-300">登录超时，请重试</p>
                </div>
                <button
                  onClick={handleReset}
                  className="w-full rounded-xl bg-blue-600 px-6 py-3 text-white hover:bg-blue-500"
                >
                  重新获取
                </button>
              </div>
            )}
          </div>

          <p className="mt-6 text-center text-xs text-gray-500">
            每人消耗各自 Cursor 账号额度 · Token 有时效性，过期需重新获取
          </p>
        </div>
      </div>
    </div>
  );
}
