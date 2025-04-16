'use client';

import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  getAllConversations,
  getActiveConversationId,
  saveConversations,
  saveActiveConversationId,
} from '../utils';
import { Conversation, AIModel, StreamingState } from '@/types/ai-assistant';
import {
  useConversations,
  useStreamResponse,
  useTitleGeneration,
} from '../hooks';

// 定义上下文类型
interface AIAssistantContextType {
  // 状态
  conversations: Conversation[];
  activeConversationId: string;
  availableModels: AIModel[];
  isInitialized: boolean;
  streamingState: StreamingState;

  // 计算属性
  activeConversation: Conversation | undefined;
  currentStreamingState: {
    content: string;
    thinking: string;
    isLoading: boolean;
  };
  hasModels: boolean;

  // 方法
  setActiveConversationId: (id: string) => void;
  updateConversation: ({
    id,
    updates,
  }: {
    id: string;
    updates: Partial<Omit<Conversation, 'id' | 'createdAt'>>;
  }) => void;
  addNewConversation: () => Promise<Conversation | undefined>;
  deleteConversation: (id: string) => Promise<void>;
  saveEditedTitle: (title: string) => void;
  changeModel: (model: string) => void;
  clearMessages: () => void;
  sendMessage: (userInput: string) => Promise<void>;
  stopResponding: () => void;
  toggleWebSearch: (conversationId: string) => void;
}

// 创建上下文
export const AIAssistantContext = createContext<AIAssistantContextType | null>(
  null,
);

// 上下文提供者组件
export function AIAssistantProvider({
  children,
  availableModels = [],
}: {
  children: React.ReactNode;
  availableModels?: AIModel[];
}) {
  // 页面初始化状态标记
  const [isInitialized, setIsInitialized] = useState(false);

  // 使用自定义hooks
  const {
    streamingState,
    setStreamingState,
    abortControllersRef,
    startStreamResponse,
    resetStreamingState,
    stopStreamResponse,
  } = useStreamResponse();

  const {
    pendingTitleGeneration,
    removePendingTitleGeneration,
    handleTitleGeneration,
    handleStreamingComplete: handleTitleStreamingComplete,
  } = useTitleGeneration();

  // 合并流式响应完成时的处理函数
  const handleStreamingComplete = useCallback(
    (conversationId: string) => {
      // 处理标题生成
      setConversations((currentConversations) => {
        handleTitleStreamingComplete(conversationId, currentConversations);
        return currentConversations;
      });
    },
    [handleTitleStreamingComplete],
  );

  const {
    conversations,
    setConversations,
    activeConversationId,
    setActiveConversationId,
    updateConversation,
    addNewConversation: addNewConversationBase,
    deleteConversation: deleteConversationBase,
    saveEditedTitle: saveEditedTitleBase,
    changeModel: changeModelBase,
    clearMessages: clearMessagesBase,
    sendMessage: sendMessageBase,
    toggleWebSearch,
  } = useConversations({
    abortControllersRef,
    removePendingTitleGeneration,
    startStreamResponse,
    handleStreamingComplete,
    resetStreamingState,
    setStreamingState,
  });

  // ==== 计算属性 ====
  // 当前激活的对话对象
  const activeConversation = useMemo(
    () => conversations.find((conv) => conv.id === activeConversationId),
    [conversations, activeConversationId],
  );

  // 当前对话的流式响应状态
  const currentStreamingState = useMemo(
    () =>
      streamingState[activeConversationId] || {
        content: '',
        thinking: '',
        isLoading: false,
      },
    [streamingState, activeConversationId],
  );

  // 是否有可用的AI模型
  const hasModels = useMemo(
    () => availableModels.length > 0,
    [availableModels],
  );

  // ==== 初始化数据加载 ====
  useEffect(() => {
    const loadData = async () => {
      try {
        // 并行加载所有对话和当前活跃对话ID
        const [storedConversations, storedActiveId] = await Promise.all([
          getAllConversations(),
          getActiveConversationId(),
        ]);

        // 先设置现有对话
        setConversations(storedConversations);

        // 如果有对话且有有效的activeId，直接使用
        if (
          storedConversations.length > 0 &&
          storedActiveId &&
          storedConversations.some((conv) => conv.id === storedActiveId)
        ) {
          setActiveConversationId(storedActiveId);
        }
        // 如果有对话但没有有效的activeId，设置第一个对话为激活对话
        else if (storedConversations.length > 0) {
          setActiveConversationId(storedConversations[0].id);
        }
        // 如果没有对话且有可用模型，稍后由ClientContent组件处理创建新对话

        setIsInitialized(true);
      } catch (error) {
        console.error('加载数据失败:', error);
        setIsInitialized(true);
      }
    };

    loadData();

    // 清理AbortController
    return () => {
      Object.values(abortControllersRef.current).forEach((controller) => {
        controller?.abort();
      });
    };
  }, [
    availableModels,
    setConversations,
    setActiveConversationId,
    abortControllersRef,
  ]);

  // ==== 数据持久化 ====
  useEffect(() => {
    // 只有初始化完成后才进行保存操作
    if (!isInitialized) return;

    const saveData = async () => {
      try {
        // 保存所有对话和当前活跃对话ID
        await Promise.all([
          saveConversations(conversations),
          saveActiveConversationId(activeConversationId),
        ]);
      } catch (error) {
        console.error('保存数据失败:', error);
      }
    };

    saveData();
  }, [conversations, activeConversationId, isInitialized]);

  // ==== 自动标题生成处理 ====
  useEffect(() => {
    // 只有初始化完成且有待处理的标题生成请求时才执行
    if (!isInitialized || pendingTitleGeneration.size === 0) return;

    const generateTitles = async () => {
      const processedIds = new Set<string>();

      // 遍历所有需要生成标题的对话
      for (const conversationId of pendingTitleGeneration) {
        try {
          await handleTitleGeneration(
            conversationId,
            conversations,
            setConversations,
          );
          processedIds.add(conversationId);
        } catch (error) {
          console.error('处理标题生成失败:', error);
        }
      }
    };

    generateTitles();
  }, [
    conversations,
    isInitialized,
    pendingTitleGeneration,
    handleTitleGeneration,
    setConversations,
  ]);

  // ==== 对话操作函数的包装 ====
  const addNewConversation = useCallback(async () => {
    if (!hasModels) return;
    return await addNewConversationBase(availableModels);
  }, [hasModels, availableModels, addNewConversationBase]);

  const deleteConversation = useCallback(
    async (id: string) => {
      await deleteConversationBase(id, availableModels);
    },
    [deleteConversationBase, availableModels],
  );

  const saveEditedTitle = useCallback(
    (title: string) => {
      saveEditedTitleBase(title, activeConversation);
    },
    [saveEditedTitleBase, activeConversation],
  );

  const changeModel = useCallback(
    (model: string) => {
      changeModelBase(model, activeConversation);
    },
    [changeModelBase, activeConversation],
  );

  const clearMessages = useCallback(() => {
    clearMessagesBase(activeConversation);
  }, [clearMessagesBase, activeConversation]);

  const sendMessage = useCallback(
    async (userInput: string) => {
      await sendMessageBase(userInput, activeConversation);
    },
    [sendMessageBase, activeConversation],
  );

  const stopResponding = useCallback(() => {
    if (!activeConversationId) return;

    stopStreamResponse({
      conversationId: activeConversationId,
      setConversations,
    });
  }, [activeConversationId, stopStreamResponse, setConversations]);

  // 提供上下文值
  const contextValue = useMemo(
    () => ({
      // 状态
      conversations,
      activeConversationId,
      availableModels,
      isInitialized,
      streamingState,

      // 计算属性
      activeConversation,
      currentStreamingState,
      hasModels,

      // 方法
      setActiveConversationId,
      updateConversation,
      addNewConversation,
      deleteConversation,
      saveEditedTitle,
      changeModel,
      clearMessages,
      sendMessage,
      stopResponding,
      toggleWebSearch,
    }),
    [
      conversations,
      activeConversationId,
      availableModels,
      isInitialized,
      streamingState,
      activeConversation,
      currentStreamingState,
      hasModels,
      setActiveConversationId,
      updateConversation,
      addNewConversation,
      deleteConversation,
      saveEditedTitle,
      changeModel,
      clearMessages,
      sendMessage,
      stopResponding,
      toggleWebSearch,
    ],
  );

  return (
    <AIAssistantContext.Provider value={contextValue}>
      {children}
    </AIAssistantContext.Provider>
  );
}
