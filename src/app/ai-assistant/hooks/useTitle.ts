import { useCallback } from 'react';
import { AiRoleEnum, Message } from '@/types/ai-assistant';
import { generateTitle } from '@/lib/services/ai-assistant';

/**
 * 用于生成对话标题的hook
 * @returns 生成标题的函数
 */
export function useTitle() {
  const generateConversationTitle = useCallback(
    async (messages: Message[]): Promise<string> => {
      // 如果没有消息，返回默认标题
      if (!messages?.length) return '新对话';

      try {
        // 提取用户最初的问题
        const userMessages = messages.filter((msg) => msg.role === 'user');
        if (!userMessages.length) return '新对话';

        // 获取第一条用户消息，并限制长度
        const firstUserMsg = userMessages[0].content.slice(0, 200);

        // 构建系统提示和用户消息
        const requestBody = {
          messages: [
            {
              role: AiRoleEnum.System,
              content:
                '你是一个标题生成助手。根据用户的提问生成一个简短的标题（10个字以内），标题应该概括对话的主题或目的。只返回标题，不要包含任何其他文字或标点符号。',
            },
            { role: AiRoleEnum.User, content: firstUserMsg },
          ],
        };

        // 使用服务层API调用
        const title = await generateTitle(requestBody);

        // 处理API返回的数据
        if (title && typeof title === 'string') {
          return (
            title.trim().slice(0, 20) || extractFallbackTitle(userMessages[0])
          );
        }

        // 无有效标题时使用回退方案
        return extractFallbackTitle(userMessages[0]);
      } catch (error) {
        console.error('生成标题失败:', error);

        // 错误时使用回退方案
        const userMessages = messages.filter((msg) => msg.role === 'user');
        return userMessages.length
          ? extractFallbackTitle(userMessages[0])
          : '新对话';
      }
    },
    [],
  );

  // 从用户消息提取回退标题
  const extractFallbackTitle = (message: Message): string => {
    return message.content.slice(0, 15) + '...';
  };

  return { generateConversationTitle };
}
