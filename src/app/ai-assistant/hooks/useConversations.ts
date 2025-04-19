import { RefObject, useCallback, useState } from 'react';
import {
  Conversation,
  AIModel,
  Message,
  AiRoleEnum,
  StreamingState,
  AIModelEnum,
} from '@/types/ai-assistant';
import {
  createNewConversation,
  saveConversation,
  deleteConversation as deleteConversationFromDB,
  optimizeConversationHistory,
} from '../utils';
import { generateUUID } from '@/lib';

interface UseConversationsProps {
  abortControllersRef: RefObject<Record<string, AbortController | null>>;
  removePendingTitleGeneration: (conversationId: string) => void;
  startStreamResponse: (params: {
    messages: Message[];
    selectedModel: string;
    isWebSearchEnabled: boolean;
    abortControllerRef: RefObject<Record<string, AbortController | null>>;
    setStreamingState: React.Dispatch<React.SetStateAction<StreamingState>>;
    conversationId: string;
    setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
    onComplete: (conversationId: string) => void;
  }) => Promise<void>;
  handleStreamingComplete: (conversationId: string) => void;
  resetStreamingState: (
    setStreamingState: React.Dispatch<React.SetStateAction<StreamingState>>,
    conversationId: string,
  ) => void;
  setStreamingState: React.Dispatch<React.SetStateAction<StreamingState>>;
}

export const useConversations = ({
  abortControllersRef,
  removePendingTitleGeneration,
  startStreamResponse,
  handleStreamingComplete,
  resetStreamingState,
  setStreamingState,
}: UseConversationsProps) => {
  // 所有对话列表
  const [conversations, setConversations] = useState<Conversation[]>([]);
  // 当前激活的对话ID
  const [activeConversationId, setActiveConversationId] = useState<string>('');

  // 更新指定对话的属性
  const updateConversation = useCallback(
    ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Omit<Conversation, 'id' | 'createdAt'>>;
    }) => {
      setConversations((currentConversations) =>
        currentConversations.map((conv) =>
          conv.id === id
            ? {
                ...conv,
                ...updates,
                updatedAt: new Date().toISOString(),
              }
            : conv,
        ),
      );
    },
    [],
  );

  // 清理指定对话的AbortController连接
  const cleanupAbortController = useCallback(
    (conversationId: string) => {
      if (abortControllersRef.current[conversationId]) {
        console.log('清理AbortController:', conversationId);
        abortControllersRef.current[conversationId]?.abort();
        abortControllersRef.current[conversationId] = null;
      }
    },
    [abortControllersRef],
  );

  // 创建新对话
  const addNewConversation = useCallback(
    async (availableModels: AIModel[]) => {
      if (!availableModels.length) return;

      const newConversation = createNewConversation({
        selectedModel: availableModels[0].id,
        availableModels,
      });

      setConversations((prev) => [...prev, newConversation]);
      setActiveConversationId(newConversation.id);

      // 保存新对话到数据库
      try {
        await saveConversation(newConversation);
      } catch (error) {
        console.error('保存新对话失败:', error);
      }

      return newConversation;
    },
    [setActiveConversationId],
  );

  // 删除对话
  const deleteConversation = useCallback(
    async (id: string, availableModels: AIModel[]) => {
      try {
        // 清理相关资源
        cleanupAbortController(id);
        removePendingTitleGeneration(id);
        await deleteConversationFromDB(id);

        // 更新对话列表
        const newConversations = conversations.filter((conv) => conv.id !== id);
        setConversations(newConversations);

        // 清理流式响应状态
        setStreamingState((prev: StreamingState) => {
          const newState = { ...prev };
          delete newState[id];
          return newState;
        });

        // 如果删除的是当前激活的对话，则需要切换到其他对话
        if (id === activeConversationId) {
          if (newConversations.length > 0) {
            // 有其他对话，切换到第一个
            setActiveConversationId(newConversations[0].id);
          } else if (availableModels.length > 0) {
            const newConversation = createNewConversation({
              selectedModel: availableModels[0].id,
              availableModels,
            });

            setConversations([newConversation]);
            setActiveConversationId(newConversation.id);
            await saveConversation(newConversation);
          } else {
            // 没有其他对话也没有可用模型，清空激活ID
            setActiveConversationId('');
          }
        }
      } catch (error) {
        console.error('删除对话失败:', error);
      }
    },
    [
      cleanupAbortController,
      removePendingTitleGeneration,
      activeConversationId,
      conversations,
      setStreamingState,
    ],
  );

  // 保存编辑后的对话标题
  const saveEditedTitle = useCallback(
    (title: string, activeConversation?: Conversation) => {
      if (!activeConversation) return;

      // 手动编辑了标题，从待生成队列中移除
      removePendingTitleGeneration(activeConversationId);
      updateConversation({
        id: activeConversationId,
        updates: {
          title,
          hasGeneratedTitle: true,
        },
      });
    },
    [activeConversationId, removePendingTitleGeneration, updateConversation],
  );

  // 更改当前对话使用的AI模型
  const changeModel = useCallback(
    (model: AIModelEnum, activeConversation?: Conversation) => {
      if (!activeConversation) return;
      updateConversation({
        id: activeConversationId,
        updates: { selectedModel: model },
      });
    },
    [activeConversationId, updateConversation],
  );

  // 清空当前对话的所有消息
  const clearMessages = useCallback(
    (activeConversation?: Conversation) => {
      if (!activeConversation) return;

      // 清理相关资源
      cleanupAbortController(activeConversationId);
      removePendingTitleGeneration(activeConversationId);

      updateConversation({
        id: activeConversationId,
        updates: {
          messages: [],
          title: '新对话',
          hasGeneratedTitle: false,
        },
      });

      // 重置流式响应状态
      resetStreamingState(setStreamingState, activeConversationId);
    },
    [
      activeConversationId,
      cleanupAbortController,
      removePendingTitleGeneration,
      updateConversation,
      resetStreamingState,
      setStreamingState,
    ],
  );

  // 切换指定对话的联网搜索状态
  const toggleWebSearch = useCallback((conversationId: string) => {
    setConversations((currentConversations) =>
      currentConversations.map((conv) =>
        conv.id === conversationId
          ? {
              ...conv,
              isWebSearchEnabled: !conv.isWebSearchEnabled, // 状态取反
              updatedAt: new Date().toISOString(),
            }
          : conv,
      ),
    );
    // 注意：这里没有调用 saveConversation，如果需要持久化此状态，
    // 需要在 conversations 状态变化时（useEffect in Provider）统一保存
  }, []);

  // 发送用户消息并处理AI响应
  const sendMessage = useCallback(
    async (userInput: string, activeConversation?: Conversation) => {
      if (!activeConversationId || !userInput.trim() || !activeConversation)
        return;

      try {
        // 创建新的用户消息
        const userMessage: Message = {
          id: generateUUID(),
          role: AiRoleEnum.User,
          content: userInput.trim(),
        };

        // 更新对话消息列表
        setConversations((currentConversations) => {
          const updatedConversations = currentConversations.map((conv) =>
            conv.id === activeConversationId
              ? {
                  ...conv,
                  messages: [...conv.messages, userMessage],
                  updatedAt: new Date().toISOString(),
                }
              : conv,
          );
          return updatedConversations;
        });

        // 准备请求消息列表（包含历史消息和当前用户输入）
        const currentConversation = conversations.find(
          (conv) => conv.id === activeConversationId,
        );

        if (!currentConversation) return;

        // 发起流式响应请求
        const allMessages = [...currentConversation.messages, userMessage];

        // 优化历史记录，减少传输到AI的上下文量
        const optimizedMessages = optimizeConversationHistory(allMessages);

        await startStreamResponse({
          messages: optimizedMessages,
          selectedModel: activeConversation.selectedModel,
          isWebSearchEnabled: activeConversation.isWebSearchEnabled,
          abortControllerRef: abortControllersRef,
          setStreamingState,
          conversationId: activeConversationId,
          setConversations,
          onComplete: handleStreamingComplete,
        });
      } catch (error) {
        console.error('发送消息失败:', error);
      }
    },
    [
      activeConversationId,
      conversations,
      abortControllersRef,
      setStreamingState,
      startStreamResponse,
      handleStreamingComplete,
    ],
  );

  return {
    conversations,
    setConversations,
    activeConversationId,
    setActiveConversationId,
    updateConversation,
    addNewConversation,
    deleteConversation,
    saveEditedTitle,
    changeModel,
    clearMessages,
    sendMessage,
    toggleWebSearch,
    cleanupAbortController,
  };
};
