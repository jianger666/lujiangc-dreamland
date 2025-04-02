'use client';

import { useState, useCallback } from 'react';

/**
 * 复制文本到剪贴板的自定义Hook
 * @param timeout 复制成功后显示成功状态的时间(毫秒)
 * @returns 复制状态和复制函数
 */
export function useCopyToClipboard(timeout = 2000) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = useCallback(
    (text: string) => {
      navigator.clipboard.writeText(text);
      setCopied(true);
      const timer = setTimeout(() => setCopied(false), timeout);
      return () => clearTimeout(timer);
    },
    [timeout],
  );

  return { copied, copyToClipboard };
}
