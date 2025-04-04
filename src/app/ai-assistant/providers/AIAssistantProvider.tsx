'use client';

import React, {
  createContext,
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import {
  createNewConversation,
  fetchAvailableModels,
  getAllConversations,
  getActiveConversationId,
  saveConversations,
  saveActiveConversationId,
  saveConversation,
  deleteConversation as deleteConversationFromDB,
  generateConversationTitle,
  optimizeConversationHistory,
} from '../utils';
import {
  resetStreamingState,
  startStreamResponse,
  stopStreamResponse,
} from '../utils/streamService';
import { Conversation, Message, AIModel, StreamingState } from '../types';
import { generateUUID } from '@/lib/uuid';

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
  updateConversation: (
    id: string,
    updates: Partial<Omit<Conversation, 'id' | 'createdAt'>>,
  ) => void;
  addNewConversation: () => void;
  deleteConversation: (id: string) => Promise<void>;
  saveEditedTitle: (title: string) => void;
  changeModel: (model: string) => void;
  clearMessages: () => void;
  sendMessage: (userInput: string) => Promise<void>;
  stopResponding: () => void;
}

// 创建上下文
export const AIAssistantContext = createContext<AIAssistantContextType | null>(
  null,
);

// 上下文提供者组件
export function AIAssistantProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // ==== 状态管理 ====
  // 所有对话列表
  const [conversations, setConversations] = useState<Conversation[]>([]);
  // 当前激活的对话ID
  const [activeConversationId, setActiveConversationId] = useState<string>('');
  // 可用的AI模型列表
  const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
  // 页面初始化状态标记
  const [isInitialized, setIsInitialized] = useState(false);
  // 各对话的流式响应状态
  const [streamingState, setStreamingState] = useState<StreamingState>({});
  // 等待生成标题的对话ID集合
  const [pendingTitleGeneration, setPendingTitleGeneration] = useState<
    Set<string>
  >(new Set());

  // ==== Refs ====
  // 存储每个对话的AbortController实例，用于流式响应
  const abortControllersRef = useRef<Record<string, AbortController | null>>(
    {},
  );

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
        // 并行加载所有对话、当前活跃对话ID和可用模型
        const [storedConversations, storedActiveId, models] = await Promise.all(
          [
            getAllConversations(),
            getActiveConversationId(),
            fetchAvailableModels(),
          ],
        );

        setConversations(storedConversations);
        setActiveConversationId(storedActiveId);
        setAvailableModels(models);

        // 如果没有对话且有可用模型，创建默认对话
        if (storedConversations.length === 0 && models.length > 0) {
          const newConversation = createNewConversation(
            models[0].id,
            [],
            models,
          );

          setConversations([newConversation]);
          setActiveConversationId(newConversation.id);
          await saveConversation(newConversation);
        }

        setIsInitialized(true);
      } catch (error) {
        console.error('加载数据失败:', error);
        setIsInitialized(true);
      }
    };

    loadData();

    const currentAbortControllers = abortControllersRef.current;

    return () => {
      Object.values(currentAbortControllers).forEach((controller) => {
        controller?.abort();
      });
    };
  }, []);

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
        const conversation = conversations.find(
          (conv) => conv.id === conversationId,
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
              conversation.messages,
            );

            // 更新对话标题
            setConversations((prev) =>
              prev.map((conv) =>
                conv.id === conversationId
                  ? { ...conv, title: newTitle, hasGeneratedTitle: true }
                  : conv,
              ),
            );
          } catch (error) {
            console.error('生成标题失败:', error);
          }
        }

        // 标记为已处理
        processedIds.add(conversationId);
      }

      // 批量移除已处理的ID，避免频繁更新状态
      if (processedIds.size > 0) {
        setPendingTitleGeneration((prev) => {
          const newSet = new Set(prev);
          for (const id of processedIds) {
            newSet.delete(id);
          }
          return newSet;
        });
      }
    };

    generateTitles();
  }, [conversations, isInitialized, pendingTitleGeneration]);

  // ==== 流式响应完成后的处理 ====
  const handleStreamingComplete = useCallback((conversationId: string) => {
    setConversations((currentConversations) => {
      const conversation = currentConversations.find(
        (conv) => conv.id === conversationId,
      );

      // 检查是否需要生成标题（未生成过且至少有两条消息）
      if (
        conversation &&
        !conversation.hasGeneratedTitle &&
        conversation.messages.length >= 2
      ) {
        setPendingTitleGeneration((prev) => {
          const newSet = new Set(prev);
          newSet.add(conversationId);
          return newSet;
        });
      }

      return currentConversations;
    });
  }, []);

  // ==== 辅助函数 ====
  // 从待处理标题生成队列中移除指定对话
  const removePendingTitleGeneration = useCallback((conversationId: string) => {
    setPendingTitleGeneration((prev) => {
      const newSet = new Set(prev);
      newSet.delete(conversationId);
      return newSet;
    });
  }, []);

  // 清理指定对话的AbortController连接
  const cleanupAbortController = useCallback((conversationId: string) => {
    if (abortControllersRef.current[conversationId]) {
      console.log('清理AbortController:', conversationId);
      abortControllersRef.current[conversationId]?.abort();
      abortControllersRef.current[conversationId] = null;
    }
  }, []);

  // ==== 对话操作函数 ====
  // 更新指定对话的属性
  const updateConversation = useCallback(
    (id: string, updates: Partial<Omit<Conversation, 'id' | 'createdAt'>>) => {
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

  // 创建新对话
  const addNewConversation = useCallback(() => {
    if (!hasModels) return;

    const newConversation = createNewConversation(
      availableModels[0].id,
      conversations,
      availableModels,
    );

    setConversations((prev) => [...prev, newConversation]);
    setActiveConversationId(newConversation.id);
  }, [hasModels, availableModels, conversations]);

  // 删除对话
  const deleteConversation = useCallback(
    async (id: string) => {
      try {
        // 清理相关资源
        cleanupAbortController(id);
        removePendingTitleGeneration(id);
        await deleteConversationFromDB(id);

        // 更新对话列表
        const newConversations = conversations.filter((conv) => conv.id !== id);
        setConversations(newConversations);

        // 清理流式响应状态
        setStreamingState((prev) => {
          const newState = { ...prev };
          delete newState[id];
          return newState;
        });

        // 如果删除的是当前激活的对话，则需要切换到其他对话
        if (id === activeConversationId) {
          if (newConversations.length > 0) {
            // 有其他对话，切换到第一个
            setActiveConversationId(newConversations[0].id);
          } else if (hasModels) {
            // 没有其他对话但有可用模型，创建新对话
            const newConversation = createNewConversation(
              availableModels[0].id,
              [],
              availableModels,
            );

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
      hasModels,
      availableModels,
    ],
  );

  // 保存编辑后的对话标题
  const saveEditedTitle = useCallback(
    (title: string) => {
      if (!activeConversation) return;

      // 手动编辑了标题，从待生成队列中移除
      removePendingTitleGeneration(activeConversationId);
      updateConversation(activeConversationId, {
        title,
        hasGeneratedTitle: true,
      });
    },
    [
      activeConversation,
      activeConversationId,
      removePendingTitleGeneration,
      updateConversation,
    ],
  );

  // 更改当前对话使用的AI模型
  const changeModel = useCallback(
    (model: string) => {
      if (!activeConversation) return;
      updateConversation(activeConversationId, { modelId: model });
    },
    [activeConversation, activeConversationId, updateConversation],
  );

  // 清空当前对话的所有消息
  const clearMessages = useCallback(() => {
    if (!activeConversation) return;

    // 清理相关资源
    cleanupAbortController(activeConversationId);
    removePendingTitleGeneration(activeConversationId);

    // 重置对话内容和标题
    updateConversation(activeConversationId, {
      messages: [],
      title: '新对话',
      hasGeneratedTitle: false,
    });

    // 重置流式响应状态
    resetStreamingState(setStreamingState, activeConversationId);
  }, [
    activeConversation,
    activeConversationId,
    cleanupAbortController,
    removePendingTitleGeneration,
    updateConversation,
  ]);

  // 发送用户消息并处理AI响应
  const sendMessage = useCallback(
    async (userInput: string) => {
      if (!activeConversationId || !userInput.trim() || !activeConversation)
        return;

      try {
        // 创建新的用户消息
        const userMessage: Message = {
          id: generateUUID(),
          role: 'user',
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

        console.log(
          `优化前消息数: ${allMessages.length}, 优化后: ${optimizedMessages.length}`,
        );

        // 启动流式响应
        await startStreamResponse({
          messages: optimizedMessages,
          modelId: activeConversation.modelId,
          abortControllerRef: abortControllersRef,
          setStreamingState,
          conversationId: activeConversationId,
          setConversations,
          onComplete: handleStreamingComplete,
        });
      } catch (error) {
        console.error('发送消息失败:', error);

        // 显示错误提示
        const errorMessage =
          error instanceof Error ? error.message : '发送消息时发生未知错误';

        alert(`发送消息失败: ${errorMessage}. 请稍后重试。`);
      }
    },
    [
      activeConversationId,
      activeConversation,
      conversations,
      handleStreamingComplete,
    ],
  );

  // 中止当前进行中的AI响应
  const stopResponding = useCallback(() => {
    if (!activeConversationId) return;

    console.log('调用停止响应:', activeConversationId);

    stopStreamResponse({
      abortControllerRef: abortControllersRef,
      conversationId: activeConversationId,
      setStreamingState,
      setConversations,
      streamingState,
    });
  }, [activeConversationId, streamingState]);

  // 提供上下文值
  const contextValue: AIAssistantContextType = {
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
  };

  return (
    <AIAssistantContext.Provider value={contextValue}>
      {children}
    </AIAssistantContext.Provider>
  );
}
