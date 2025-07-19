import { useCallback } from 'react';
import { Message } from '@/types/ai-assistant';
import { generateTitle } from '@/lib/services/ai-assistant';

/**
 * 用于生成对话标题的hook
 * @returns 生成标题的函数
 */
export function useTitle() {
  const generateConversationTitle = useCallback(
    async (messages: Message[]): Promise<string> => {
      let firstUserMsg = '';
      try {
        // 提取用户最初的问题
        firstUserMsg =
          messages.find((msg) => msg.role === 'user')?.content ?? '';
        if (!firstUserMsg) return '新对话';

        // 使用服务层API调用
        const title = await generateTitle(firstUserMsg);

        return title?.trim() ?? extractFallbackTitle(firstUserMsg);
      } catch (error) {
        console.error('生成标题失败:', error);
        return extractFallbackTitle(firstUserMsg);
      }
    },
    []
  );

  // 从用户消息提取回退标题
  const extractFallbackTitle = (message: string): string => {
    return message.slice(0, 10) + '...';
  };

  return { generateConversationTitle };
}
