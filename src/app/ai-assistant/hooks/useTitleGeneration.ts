import { useCallback, useState } from 'react';
import { Conversation } from '@/types/ai-assistant';
import { useTitle } from './useTitle';

export const useTitleGeneration = () => {
  // 等待生成标题的对话ID集合
  const [pendingTitleGeneration, setPendingTitleGeneration] = useState<
    Set<string>
  >(new Set());

  // 获取标题生成函数
  const { generateConversationTitle } = useTitle();

  // 从待处理标题生成队列中移除指定对话
  const removePendingTitleGeneration = useCallback((conversationId: string) => {
    setPendingTitleGeneration((prev) => {
      const newSet = new Set(prev);
      newSet.delete(conversationId);
      return newSet;
    });
  }, []);

  // 添加到待处理标题生成队列
  const addToPendingTitleGeneration = useCallback((conversationId: string) => {
    setPendingTitleGeneration((prev) => {
      const newSet = new Set(prev);
      newSet.add(conversationId);
      return newSet;
    });
  }, []);

  // 处理需要生成标题的对话
  const handleTitleGeneration = useCallback(
    async (
      conversationId: string,
      conversations: Conversation[],
      setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>
    ) => {
      if (!pendingTitleGeneration.has(conversationId)) return;

      const conversation = conversations.find(
        (conv) => conv.id === conversationId
      );

      // 只处理未生成过标题且至少有两条消息的对话
      if (
        conversation &&
        !conversation.hasGeneratedTitle &&
        conversation.messages.length >= 2
      ) {
        try {
          // 调用API生成标题
          const newTitle = await generateConversationTitle(
            conversation.messages
          );

          // 更新对话标题
          setConversations((prev) =>
            prev.map((conv) =>
              conv.id === conversationId
                ? { ...conv, title: newTitle, hasGeneratedTitle: true }
                : conv
            )
          );

          // 移除已处理的对话ID
          removePendingTitleGeneration(conversationId);
        } catch (error) {
          console.error('生成标题失败:', error);
        }
      }
    },
    [
      pendingTitleGeneration,
      generateConversationTitle,
      removePendingTitleGeneration,
    ]
  );

  // 监听流式响应完成事件的处理函数
  const handleStreamingComplete = useCallback(
    (conversationId: string, conversations: Conversation[]) => {
      const conversation = conversations.find(
        (conv) => conv.id === conversationId
      );

      // 检查是否需要生成标题（未生成过且至少有两条消息）
      if (
        conversation &&
        !conversation.hasGeneratedTitle &&
        conversation.messages.length >= 2
      ) {
        addToPendingTitleGeneration(conversationId);
      }
    },
    [addToPendingTitleGeneration]
  );

  return {
    pendingTitleGeneration,
    setPendingTitleGeneration,
    removePendingTitleGeneration,
    handleTitleGeneration,
    handleStreamingComplete,
    addToPendingTitleGeneration,
  };
};
