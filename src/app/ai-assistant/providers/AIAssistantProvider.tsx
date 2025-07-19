'use client';

import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  getAllConversations,
  getActiveConversationId,
  saveConversations,
  saveActiveConversationId,
} from '../utils/db';
import {
  saveConversationsToLocalStorage,
  loadConversationsFromLocalStorage,
  clearConversationsFromLocalStorage,
} from '../utils/localStorageHelper';
import {
  generateInterruptedConversations,
  INTERRUPTED_SUFFIX,
} from '../utils/streamService';
import {
  Conversation,
  AIModel,
  StreamingState,
  AiRoleEnum,
  AIModelEnum,
} from '@/types/ai-assistant';
import {
  useConversations,
  useStreamResponse,
  useTitleGeneration,
} from '../hooks';
import { useLocalStorage } from 'usehooks-ts';

// ==== 辅助函数 ====

/**
 * 合并 IndexedDB 和 LocalStorage 中的对话数据
 * 优先使用 LocalStorage 中记录的中断状态
 * @param dbConversations 从 IndexedDB 加载的对话
 * @param interruptedConversations 从 LocalStorage 加载的可能包含中断状态的对话
 * @returns 合并后的对话数组
 */
function mergeConversationsWithInterrupts(
  dbConversations: Conversation[],
  interruptedConversations: Conversation[] | null
): Conversation[] {
  if (!interruptedConversations) {
    return dbConversations; // 如果没有中断数据，直接返回 DB 数据
  }

  console.log('发现上次中断的对话，正在合并...', interruptedConversations);

  const dbMap = new Map(dbConversations.map((c) => [c.id, c]));
  const merged = interruptedConversations.map((intConv) => {
    const dbConv = dbMap.get(intConv.id);
    // 如果 DB 中存在该对话，检查最后一条消息是否是新的中断标记
    if (dbConv) {
      const lastIntMsg = intConv.messages[intConv.messages.length - 1];
      const lastDbMsg = dbConv.messages[dbConv.messages.length - 1];

      // 判断中断消息是否应该覆盖 DB 数据
      const shouldUseInterruptVersion =
        lastIntMsg &&
        lastIntMsg.role === AiRoleEnum.Assistant &&
        lastIntMsg.content.endsWith(INTERRUPTED_SUFFIX) &&
        (!lastDbMsg || lastDbMsg.id !== lastIntMsg.id); // 仅当DB最后一条消息不是这个中断消息时

      if (shouldUseInterruptVersion) {
        console.log(`合并对话 ${intConv.id} 的中断状态`);
        return intConv; // 使用 LocalStorage 的版本
      }
      return dbConv; // 使用 DB 的版本
    } else {
      // 如果 DB 中不存在（例如，新对话在中断前未保存到DB），则保留中断版本
      return intConv;
    }
  });

  // 检查 DB 中有但 LocalStorage 中没有的对话（可能是在中断后又操作过的），并添加回去
  dbConversations.forEach((dbConv) => {
    if (!merged.some((mc) => mc.id === dbConv.id)) {
      merged.push(dbConv);
    }
  });

  // 按更新时间重新排序，最新的在前
  merged.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return merged;
}

// ==== 上下文定义 ====

// 定义上下文类型
interface AIAssistantContextType {
  // 状态
  conversations: Conversation[];
  activeConversationId: string;
  availableModels: AIModel[];
  isInitialized: boolean; // 标记初始化是否完成
  streamingState: StreamingState; // 各对话的流式响应状态
  mobileSidebarOpen: boolean; // 移动端侧边栏是否打开状态
  desktopSidebarOpen: boolean; // 桌面端侧边栏是否打开状态

  // 计算属性
  activeConversation: Conversation | undefined; // 当前激活的对话对象
  currentStreamingState: {
    // 当前激活对话的流式状态
    content: string;
    thinking: string;
    isLoading: boolean;
  };
  hasModels: boolean; // 是否有可用的AI模型

  // 方法
  setActiveConversationId: (id: string) => void; // 设置激活对话ID
  updateConversation: ({
    // 更新对话（部分属性）
    id,
    updates,
  }: {
    id: string;
    updates: Partial<Omit<Conversation, 'id' | 'createdAt'>>;
  }) => void;
  addNewConversation: () => Promise<Conversation | undefined>; // 添加新对话
  deleteConversation: (id: string) => Promise<void>; // 删除对话
  saveEditedTitle: (title: string) => void; // 保存编辑后的标题
  changeModel: (model: AIModelEnum) => void; // 更改当前对话的模型
  clearMessages: () => void; // 清空当前对话的消息
  sendMessage: (userInput: string, imageDatas?: string[]) => Promise<void>; // 发送消息
  stopResponding: () => void; // 停止当前对话的响应生成
  toggleWebSearch: (conversationId: string) => void; // 切换联网搜索状态
  changeMobileSidebarOpen: (e: boolean) => void; // 切换移动端侧边栏打开/关闭状态
  changeDesktopSidebarOpen: (e: boolean) => void; // 切换桌面端侧边栏打开/关闭状态
}

// 创建上下文
export const AIAssistantContext = createContext<AIAssistantContextType | null>(
  null
);

// ==== 提供者组件 ====

// 上下文提供者组件
export function AIAssistantProvider({
  children,
  availableModels = [],
}: {
  children: React.ReactNode;
  availableModels?: AIModel[]; // 可选的可用模型列表
}) {
  // 页面初始化状态标记
  const [isInitialized, setIsInitialized] = useState(false);

  // 移动端的侧边栏状态
  const [mobileSidebarOpen, setSidebarOpen] = useState(false);
  const changeMobileSidebarOpen = useCallback(
    (e: boolean) => setSidebarOpen(e),
    []
  );

  // 桌面端的侧边栏状态
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useLocalStorage(
    'ai-assistant-desktop-sidebar-open',
    true
  );
  const changeDesktopSidebarOpen = useCallback(
    (e: boolean) => setDesktopSidebarOpen(e),
    [setDesktopSidebarOpen]
  );

  // 使用自定义hooks管理流式响应
  const {
    streamingState,
    setStreamingState,
    abortControllersRef, // 用于中止请求
    startStreamResponse,
    resetStreamingState,
    stopStreamResponse,
  } = useStreamResponse();

  // 使用自定义hooks管理标题生成
  const {
    pendingTitleGeneration, // 需要生成标题的对话ID集合
    removePendingTitleGeneration, // 移除待处理项
    handleTitleGeneration, // 处理标题生成逻辑
    handleStreamingComplete: handleTitleStreamingComplete, // 流完成后触发的标题生成相关处理
  } = useTitleGeneration();

  // 合并流式响应完成时的处理函数（用于触发标题生成等）
  const handleStreamingComplete = useCallback(
    (conversationId: string) => {
      // 更新对话状态以触发标题生成（如果需要）
      setConversations((currentConversations) => {
        handleTitleStreamingComplete(conversationId, currentConversations);
        return currentConversations; // 返回更新后的状态或原始状态
      });
    },
    [handleTitleStreamingComplete]
  );

  // 使用自定义hooks管理对话状态和操作
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
    abortControllersRef, // 传递给对话hook，用于在发送消息时中止之前的请求
    removePendingTitleGeneration, // 传递给对话hook，用于在删除对话时清理
    startStreamResponse, // 对话hook内部调用此函数来发送消息
    handleStreamingComplete, // 响应完成后调用的回调
    resetStreamingState, // 用于在切换对话等场景重置流状态
    setStreamingState, // 用于在对话hook内部更新流状态（虽然主要由useStreamResponse管理）
  });

  // 使用 Refs 来保存最新状态，以便在同步的 beforeunload 事件处理器中访问
  const conversationsRef = useRef(conversations);
  const streamingStateRef = useRef(streamingState);

  // 每当 conversations 或 streamingState 改变时，同步更新 Ref
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    streamingStateRef.current = streamingState;
  }, [streamingState]);

  // ==== 计算派生属性 ====

  // 当前激活的对话对象
  const activeConversation = useMemo(
    () => conversations.find((conv) => conv.id === activeConversationId),
    [conversations, activeConversationId]
  );

  // 当前激活对话的流式响应状态 (如果不存在则返回默认空状态)
  const currentStreamingState = useMemo(
    () =>
      streamingState[activeConversationId] || {
        content: '',
        thinking: '',
        isLoading: false,
      },
    [streamingState, activeConversationId]
  );

  // 是否有可用的AI模型
  const hasModels = useMemo(
    () => availableModels.length > 0,
    [availableModels]
  );

  // ==== 初始化数据加载 Effect ====
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // 1. 并行从 IndexedDB 加载对话列表和上次激活的对话 ID
        const [dbConversations, storedActiveId] = await Promise.all([
          getAllConversations(),
          getActiveConversationId(),
        ]);

        // 2. 从 LocalStorage 加载上次页面卸载时可能保存的中断状态
        const interruptedConversations = loadConversationsFromLocalStorage();

        // 3. 合并 IndexedDB 数据和 LocalStorage 中的中断数据
        const mergedConversations = mergeConversationsWithInterrupts(
          dbConversations,
          interruptedConversations
        );

        // 4. 将合并后的数据设置到 React State
        setConversations(mergedConversations);

        // 5. 设置激活对话 ID
        // 优先使用上次激活的 ID，如果无效或不存在，则使用合并后列表的第一个
        if (
          mergedConversations.length > 0 &&
          storedActiveId &&
          mergedConversations.some((conv) => conv.id === storedActiveId)
        ) {
          setActiveConversationId(storedActiveId);
        } else if (mergedConversations.length > 0) {
          setActiveConversationId(mergedConversations[0].id);
        }
        // 如果没有对话，则不设置 activeConversationId，让 ClientContent 处理

        // 6. 如果进行了合并（即上次有中断状态），将合并结果异步写回 IndexedDB 并清理 LocalStorage
        if (interruptedConversations) {
          try {
            await saveConversations(mergedConversations); // 异步写回 DB
            clearConversationsFromLocalStorage(); // 同步清理 LocalStorage
            console.log('中断状态合并完成并已清理。');
          } catch (saveError) {
            console.error('初始化时保存合并后的对话到DB失败:', saveError);
            // 注意：即使保存失败，也继续执行，因为状态已经在内存和UI中更新
          }
        }

        // 7. 标记初始化完成
        setIsInitialized(true);
      } catch (error) {
        console.error('加载初始化数据失败:', error);
        setIsInitialized(true); // 即使加载失败，也标记为已初始化，避免阻塞UI
      }
    };

    loadInitialData();

    // 组件卸载时的清理函数：中止所有可能正在进行的流式请求
    return () => {
      Object.values(abortControllersRef.current).forEach((controller) => {
        controller?.abort();
      });
    };
  }, [
    // 依赖项确保只在挂载时运行一次
    availableModels, // availableModels 通常是稳定的
    setConversations, // React state setter 是稳定的
    setActiveConversationId, // React state setter 是稳定的
    abortControllersRef, // Ref 是稳定的
  ]);

  // ==== 数据持久化 Effect (保存到 IndexedDB) ====
  useEffect(() => {
    // 确保只在初始化完成后才执行保存操作，避免覆盖初始化时的合并逻辑
    if (!isInitialized) return;

    const saveDataToDB = async () => {
      try {
        // 将当前的对话列表和激活 ID 异步保存到 IndexedDB
        await Promise.all([
          saveConversations(conversations),
          saveActiveConversationId(activeConversationId),
        ]);
      } catch (error) {
        console.error('持久化数据到 IndexedDB 失败:', error);
      }
    };

    // 优化：可以考虑添加 debounce 来减少频繁写入
    saveDataToDB();
  }, [conversations, activeConversationId, isInitialized]);

  // ==== 自动标题生成 Effect ====
  useEffect(() => {
    // 确保只在初始化完成后且有待处理项时运行
    if (!isInitialized || pendingTitleGeneration.size === 0) return;

    const generatePendingTitles = async () => {
      // 遍历所有需要生成标题的对话ID
      for (const conversationId of pendingTitleGeneration) {
        try {
          // 调用标题生成处理函数（内部会更新 conversations 状态）
          await handleTitleGeneration(
            conversationId,
            conversations,
            setConversations
          );
          // 注意：不需要在这里手动移除 pending 项，handleTitleGeneration 内部会处理
        } catch (error) {
          console.error(`处理对话 ${conversationId} 的标题生成失败:`, error);
          // 即使失败，也尝试从待处理集合中移除，防止无限重试
          removePendingTitleGeneration(conversationId);
        }
      }
    };

    generatePendingTitles();
  }, [
    conversations, // 依赖 conversations 以便在 handleTitleGeneration 中获取最新消息
    isInitialized,
    pendingTitleGeneration,
    handleTitleGeneration,
    setConversations,
    removePendingTitleGeneration, // 添加依赖
  ]);

  // ==== 对话操作函数的包装 (主要是为了传递 activeConversation) ====

  // 添加新对话
  const addNewConversation = useCallback(async () => {
    if (!hasModels) return; // 如果没有可用模型，不执行
    return await addNewConversationBase(availableModels);
  }, [hasModels, availableModels, addNewConversationBase]);

  // 删除对话
  const deleteConversation = useCallback(
    async (id: string) => {
      await deleteConversationBase(id, availableModels);
    },
    [deleteConversationBase, availableModels]
  );

  // 保存编辑后的标题 (针对当前激活对话)
  const saveEditedTitle = useCallback(
    (title: string) => {
      saveEditedTitleBase(title, activeConversation);
    },
    [saveEditedTitleBase, activeConversation]
  );

  // 更改模型 (针对当前激活对话)
  const changeModel = useCallback(
    (model: AIModelEnum) => {
      changeModelBase(model, activeConversation);
    },
    [changeModelBase, activeConversation]
  );

  // 清空消息 (针对当前激活对话)
  const clearMessages = useCallback(() => {
    clearMessagesBase(activeConversation);
  }, [clearMessagesBase, activeConversation]);

  // 发送消息
  const sendMessage = useCallback(
    async (userInput: string, imageDatas?: string[]) => {
      if (!activeConversation) return;
      await sendMessageBase(userInput, imageDatas);
    },
    [activeConversation, sendMessageBase]
  );

  // 停止响应 (针对当前激活对话)
  const stopResponding = useCallback(() => {
    if (!activeConversationId) return; // 如果没有激活对话，不执行

    stopStreamResponse({
      conversationId: activeConversationId,
      setConversations, // 传递 setConversations 以便在 stopStreamResponse 中添加中断消息
    });
  }, [activeConversationId, stopStreamResponse, setConversations]);

  // ==== 构造并提供上下文值 ====
  const contextValue = useMemo(
    () => ({
      // 状态
      conversations,
      activeConversationId,
      availableModels,
      isInitialized,
      streamingState,
      mobileSidebarOpen,
      desktopSidebarOpen,
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
      changeMobileSidebarOpen,
      changeDesktopSidebarOpen,
    }),
    [
      // 依赖列表包含了所有上下文值中使用的变量和函数
      conversations,
      activeConversationId,
      availableModels,
      isInitialized,
      streamingState,
      mobileSidebarOpen,
      desktopSidebarOpen,
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
      changeMobileSidebarOpen,
      changeDesktopSidebarOpen,
    ]
  );

  // ==== 处理页面卸载时的中断保存 Effect ====
  useEffect(() => {
    const handleBeforeUnload = () => {
      // 检查是否有任何对话正在进行的流式响应
      const hasActiveStreams = Object.values(streamingStateRef.current).some(
        (state) => state?.isLoading
      );

      if (hasActiveStreams) {
        console.log(
          '页面即将卸载，检测到活动流，正在同步保存中断状态到 LocalStorage...'
        );
        // 基于当前 Ref 中的状态，生成包含中断标记的新对话数组
        const interruptedConversations = generateInterruptedConversations(
          conversationsRef.current, // 使用 Ref 获取最新状态
          streamingStateRef.current // 使用 Ref 获取最新状态
        );
        // 同步将此快照保存到 LocalStorage，供下次加载时合并
        saveConversationsToLocalStorage(interruptedConversations);
      }
    };

    // 添加事件监听器
    window.addEventListener('beforeunload', handleBeforeUnload);

    // 组件卸载时移除监听器
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []); // 空依赖数组确保只在挂载和卸载时运行

  // 如果没有活跃对话，自动创建一个新对话
  useEffect(() => {
    if (isInitialized && !activeConversation && conversations.length === 0) {
      addNewConversation();
    }
  }, [
    isInitialized,
    activeConversation,
    conversations.length,
    addNewConversation,
  ]);

  // 渲染上下文提供者，包裹子组件
  return (
    <AIAssistantContext.Provider value={contextValue}>
      {children}
    </AIAssistantContext.Provider>
  );
}
