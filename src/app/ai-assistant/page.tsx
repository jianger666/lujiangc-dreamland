'use client';

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import { ConversationSidebar } from './components/ConversationSidebar';
import { ConversationHeader } from './components/ConversationHeader';
import { MessageList } from './components/MessageList';
import { ChatInput } from './components/ChatInput';
import { EmptyConversation } from './components/EmptyConversation';
import { Loading } from '@/components/ui/loading';
import {
  createNewConversation,
  fetchAvailableModels,
  handleStreamWithEventSource,
  getAllConversations,
  getActiveConversationId,
  saveConversations,
  saveActiveConversationId,
  saveConversation,
  deleteConversation as deleteConversationFromDB,
  generateConversationTitle,
} from './utils';
import {
  Conversation,
  Message,
  AIModel,
  ConversationStreamState,
  StreamingState,
} from './types';
import { generateUUID } from '@/lib/uuid';

export default function AIAssistantPage() {
  // 存储所有对话
  const [conversations, setConversations] = useState<Conversation[]>([]);

  // 当前活跃对话ID
  const [activeConversationId, setActiveConversationId] = useState<string>('');

  // 可用的AI模型
  const [availableModels, setAvailableModels] = useState<AIModel[]>([]);

  // 是否已完成初始化
  const [isInitialized, setIsInitialized] = useState(false);

  // 每个对话的流式生成状态
  const [streamingState, setStreamingState] = useState<StreamingState>({});

  // 记录需要生成标题的对话ID
  const [pendingTitleGeneration, setPendingTitleGeneration] = useState<
    Set<string>
  >(new Set());

  // 每个会话的EventSource引用
  const eventSourcesRef = useRef<Record<string, EventSource | null>>({});

  // 获取当前活跃对话
  const activeConversation = useMemo(
    () => conversations.find((conv) => conv.id === activeConversationId),
    [conversations, activeConversationId],
  );

  // 获取当前对话的流式状态
  const currentStreamingState = useMemo(
    () =>
      streamingState[activeConversationId] ||
      ({
        content: '',
        thinking: '',
        isLoading: false,
      } as ConversationStreamState),
    [streamingState, activeConversationId],
  );

  // 是否有可用模型
  const hasModels = useMemo(
    () => availableModels.length > 0,
    [availableModels],
  );

  // 加载初始数据并设置数据变化的保存
  useEffect(() => {
    // 加载初始数据
    const loadData = async () => {
      try {
        // 从 IndexedDB 加载数据
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

        // 如果没有对话，创建第一个默认对话
        if (storedConversations.length === 0 && models.length > 0) {
          const newConversation = createNewConversation(
            models[0].id,
            [],
            models,
          );

          // 更新状态
          setConversations([newConversation]);
          setActiveConversationId(newConversation.id);

          // 保存到数据库
          await Promise.all([
            saveConversation(newConversation),
            saveActiveConversationId(newConversation.id),
          ]);
        }

        setIsInitialized(true);
      } catch (error) {
        console.error('加载数据失败:', error);
        setIsInitialized(true);
      }
    };

    loadData();

    // 组件卸载时清理所有EventSource
    return () => {
      Object.values(eventSourcesRef.current).forEach((eventSource) => {
        if (eventSource) {
          eventSource.close();
        }
      });
    };
  }, []);

  // 处理流式生成完成的回调
  const handleStreamingComplete = useCallback((conversationId: string) => {
    console.log('流式生成完成:', conversationId);

    // 直接从当前状态获取conversation会有闭包问题，使用回调函数形式确保获取最新状态
    setConversations((currentConversations) => {
      const conversation = currentConversations.find(
        (conv) => conv.id === conversationId,
      );

      // 如果对话没有生成过标题，将其添加到待生成标题队列
      if (
        conversation &&
        !conversation.hasGeneratedTitle &&
        conversation.messages.length >= 2 // 确保至少有一问一答（用户+AI）
      ) {
        console.log(
          '添加到标题生成队列:',
          conversationId,
          '消息数量:',
          conversation.messages.length,
        );

        // 使用React状态来跟踪待生成标题的对话ID，这样更符合React范式
        setPendingTitleGeneration((prev) => {
          const newSet = new Set(prev);
          newSet.add(conversationId);
          return newSet;
        });
      }

      return currentConversations;
    });
  }, []);

  // 从待生成标题集合中移除对话ID的通用函数
  const removePendingTitleGeneration = useCallback((conversationId: string) => {
    setPendingTitleGeneration((prev) => {
      const newSet = new Set(prev);
      newSet.delete(conversationId);
      return newSet;
    });
  }, []);

  // 处理需要生成标题的对话
  useEffect(() => {
    // 不需要生成标题时直接返回
    if (!isInitialized || pendingTitleGeneration.size === 0) return;

    console.log(
      '开始生成标题，待处理对话数量:',
      pendingTitleGeneration.size,
      '待处理ID:',
      [...pendingTitleGeneration],
    );

    // 定义异步函数处理标题生成
    const generateTitles = async () => {
      // 创建处理ID的集合
      const processedIds = new Set<string>();

      // 遍历待处理的对话ID
      for (const conversationId of pendingTitleGeneration) {
        const conversation = conversations.find(
          (conv) => conv.id === conversationId,
        );

        // 检查对话是否符合生成标题的条件
        const shouldGenerateTitle =
          conversation &&
          !conversation.hasGeneratedTitle &&
          conversation.messages.length >= 2;

        if (shouldGenerateTitle) {
          try {
            console.log(
              '为对话生成标题:',
              conversationId,
              '消息数量:',
              conversation.messages.length,
            );

            // 生成标题并更新对话
            const newTitle = await generateConversationTitle(
              conversation.messages,
            );
            console.log('标题生成成功:', newTitle);

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
        } else {
          console.log(
            '跳过标题生成:',
            conversationId,
            conversation
              ? `已生成:${conversation.hasGeneratedTitle}, 消息数量:${conversation.messages.length}`
              : '对话不存在',
          );
        }

        // 无论成功失败，都将此ID标记为已处理
        processedIds.add(conversationId);
      }

      // 批量移除已处理的ID
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

  // 保存数据变化到 IndexedDB
  useEffect(() => {
    if (!isInitialized) return;

    // 保存对话和活跃对话ID
    const saveData = async () => {
      try {
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

  // 清理特定对话的EventSource
  const cleanupEventSource = useCallback((conversationId: string) => {
    if (eventSourcesRef.current[conversationId]) {
      eventSourcesRef.current[conversationId]?.close();
      eventSourcesRef.current[conversationId] = null;
    }
  }, []);

  // 重置特定对话的流式状态
  const resetStreamingState = useCallback((conversationId: string) => {
    setStreamingState((prev) => ({
      ...prev,
      [conversationId]: {
        content: '',
        thinking: '',
        isLoading: false,
      },
    }));
  }, []);

  // 添加新对话
  const addNewConversation = useCallback(() => {
    if (!hasModels) return;

    const newConversation = createNewConversation(
      availableModels[0].id,
      conversations,
      availableModels,
    );

    setConversations([...conversations, newConversation]);
    setActiveConversationId(newConversation.id);
  }, [hasModels, availableModels, conversations]);

  // 删除对话
  const deleteConversation = useCallback(
    async (id: string) => {
      try {
        // 清理对应的EventSource
        cleanupEventSource(id);

        // 从待生成标题列表中移除
        removePendingTitleGeneration(id);

        // 从 IndexedDB 删除
        await deleteConversationFromDB(id);

        // 更新状态
        const newConversations = conversations.filter((conv) => conv.id !== id);
        setConversations(newConversations);

        // 更新streaming状态
        setStreamingState((prev) => {
          const newState = { ...prev };
          delete newState[id];
          return newState;
        });

        // 如果删除的是当前活跃对话，切换到第一个对话，或者创建新对话
        if (id === activeConversationId) {
          if (newConversations.length > 0) {
            setActiveConversationId(newConversations[0].id);
          } else if (hasModels) {
            // 创建新对话
            addNewEmptyConversation();
          } else {
            setActiveConversationId('');
          }
        }
      } catch (error) {
        console.error('删除对话失败:', error);
      }
    },
    [
      cleanupEventSource,
      removePendingTitleGeneration,
      activeConversationId,
      conversations,
      hasModels,
    ],
  );

  // 创建新的空对话并设为活跃
  const addNewEmptyConversation = useCallback(async () => {
    if (!hasModels) return;

    const newConversation = createNewConversation(
      availableModels[0].id,
      [],
      availableModels,
    );

    setConversations([newConversation]);
    setActiveConversationId(newConversation.id);
    await saveConversation(newConversation);
  }, [hasModels, availableModels]);

  // 更新对话属性
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

  // 保存编辑的标题
  const saveEditedTitle = useCallback(
    (title: string) => {
      if (!activeConversation) return;

      // 用户手动编辑了标题，从待生成标题列表中移除
      removePendingTitleGeneration(activeConversationId);

      // 更新对话标题和生成状态
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

  // 切换模型
  const changeModel = useCallback(
    (model: string) => {
      if (!activeConversation) return;
      updateConversation(activeConversationId, { modelId: model });
    },
    [activeConversation, activeConversationId, updateConversation],
  );

  // 处理发送消息
  const handleSendMessage = useCallback(
    (content: string) => {
      if (
        !content.trim() ||
        currentStreamingState.isLoading ||
        !activeConversation
      )
        return;

      // 添加用户消息
      const userMessage: Message = {
        id: generateUUID(),
        role: 'user',
        content,
      };

      // 更新对话并启动流式处理
      setConversations((currentConversations) => {
        // 添加用户消息到对话
        const updatedConversations = currentConversations.map((conv) =>
          conv.id === activeConversationId
            ? {
                ...conv,
                messages: [...conv.messages, userMessage],
                updatedAt: new Date().toISOString(),
              }
            : conv,
        );

        // 查找更新后的对话
        const updatedConversation = updatedConversations.find(
          (conv) => conv.id === activeConversationId,
        );

        if (updatedConversation) {
          // 获取当前对话的EventSource引用
          const conversationEventSourceRef = {
            current: eventSourcesRef.current[activeConversationId] || null,
          };

          // 启动流式处理
          const eventSource = handleStreamWithEventSource(
            updatedConversation.messages,
            updatedConversation.modelId,
            conversationEventSourceRef,
            setStreamingState,
            activeConversationId,
            updatedConversations,
            setConversations,
            handleStreamingComplete,
          );

          // 保存到对应的对话的引用中
          eventSourcesRef.current[activeConversationId] = eventSource;
        }

        return updatedConversations;
      });
    },
    [
      activeConversation,
      activeConversationId,
      currentStreamingState.isLoading,
      handleStreamingComplete,
    ],
  );

  // 清空当前对话的消息
  const clearMessages = useCallback(() => {
    if (!activeConversation) return;

    // 清理对应的EventSource
    cleanupEventSource(activeConversationId);

    // 从待生成标题的列表中移除
    removePendingTitleGeneration(activeConversationId);

    // 更新对话，清空消息，重置标题
    updateConversation(activeConversationId, {
      messages: [],
      title: '新对话',
      hasGeneratedTitle: false,
    });

    // 重置流式状态
    resetStreamingState(activeConversationId);
  }, [
    activeConversation,
    activeConversationId,
    cleanupEventSource,
    removePendingTitleGeneration,
    updateConversation,
    resetStreamingState,
  ]);

  // 如果还未初始化，显示加载状态
  if (!isInitialized) {
    return <Loading fullPage text="加载中..." />;
  }

  return (
    <main className="flex h-[calc(100vh-4rem)] flex-col md:flex-row">
      {/* 侧边栏: 对话列表 */}
      <ConversationSidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onAddConversation={addNewConversation}
        onDeleteConversation={deleteConversation}
        onSelectConversation={setActiveConversationId}
        streamingState={streamingState}
      />

      {/* 主内容区: 对话界面 */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {activeConversation ? (
          <>
            {/* 对话标题栏 */}
            <ConversationHeader
              conversation={activeConversation}
              onClearMessages={clearMessages}
              onSaveTitle={saveEditedTitle}
            />

            {/* 消息区域 */}
            <div className="flex-1 overflow-y-auto p-4">
              <MessageList
                messages={activeConversation.messages}
                streamingMessage={{
                  content: currentStreamingState.content,
                  thinking: currentStreamingState.thinking,
                }}
                isLoading={currentStreamingState.isLoading}
              />
            </div>

            {/* 输入区域 */}
            <ChatInput
              isLoading={currentStreamingState.isLoading}
              modelId={activeConversation.modelId}
              availableModels={availableModels}
              onSendMessage={handleSendMessage}
              onChangeModel={changeModel}
            />
          </>
        ) : (
          <EmptyConversation onCreateConversation={addNewConversation} />
        )}
      </div>
    </main>
  );
}
