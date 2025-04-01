'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import { ConversationSidebar } from './components/ConversationSidebar';
import { ConversationHeader } from './components/ConversationHeader';
import { MessageList } from './components/MessageList';
import { ChatInput } from './components/ChatInput';
import { EmptyConversation } from './components/EmptyConversation';
import {
  createNewConversation,
  fetchAvailableModels,
  handleStreamWithEventSource,
} from './utils';
import { Conversation, Message, AIModel, StreamingMessage } from './types';

export default function AIAssistantPage() {
  // 存储所有对话
  const [conversations, setConversations] = useLocalStorage<Conversation[]>(
    'ai-assistant-conversations',
    [],
  );

  // 当前活跃对话ID
  const [activeConversationId, setActiveConversationId] =
    useLocalStorage<string>('ai-assistant-active-conversation-id', '');

  // 可用的AI模型
  const [availableModels, setAvailableModels] = useState<AIModel[]>([]);

  // 正在加载中
  const [isLoading, setIsLoading] = useState(false);

  // 当前流式生成的消息
  const [streamingMessage, setStreamingMessage] = useState<StreamingMessage>({
    content: '',
    thinking: '',
  });

  // EventSource 引用
  const eventSourceRef = useRef<EventSource | null>(null);

  // 获取当前活跃对话
  const activeConversation = conversations.find(
    (conv) => conv.id === activeConversationId,
  );

  // 初始化：获取可用模型并创建第一个对话（如果没有）
  useEffect(() => {
    const initializeApp = async () => {
      const models = await fetchAvailableModels();
      setAvailableModels(models);

      // 如果没有对话，创建第一个默认对话
      if (conversations.length === 0 && models.length > 0) {
        const newConversation = createNewConversation(models[0].id, [], models);
        setConversations([newConversation]);
        setActiveConversationId(newConversation.id);
      }
    };

    initializeApp();
  }, []);

  // 添加新对话
  const addNewConversation = () => {
    if (availableModels.length === 0) return;

    const newConversation = createNewConversation(
      availableModels[0].id,
      conversations,
      availableModels,
    );

    setConversations([...conversations, newConversation]);
    setActiveConversationId(newConversation.id);
  };

  // 删除对话
  const deleteConversation = (id: string) => {
    const newConversations = conversations.filter((conv) => conv.id !== id);
    setConversations(newConversations);

    // 如果删除的是当前活跃对话，切换到第一个对话，或者创建新对话
    if (id === activeConversationId) {
      if (newConversations.length > 0) {
        setActiveConversationId(newConversations[0].id);
      } else if (availableModels.length > 0) {
        const newConversation = createNewConversation(
          availableModels[0].id,
          [],
          availableModels,
        );
        setConversations([newConversation]);
        setActiveConversationId(newConversation.id);
      } else {
        setActiveConversationId('');
      }
    }
  };

  // 保存编辑的标题
  const saveEditedTitle = (title: string) => {
    if (!activeConversation) return;

    const updatedConversations = conversations.map((conv) =>
      conv.id === activeConversationId
        ? { ...conv, title, updatedAt: new Date().toISOString() }
        : conv,
    );

    setConversations(updatedConversations);
  };

  // 切换模型
  const changeModel = (model: string) => {
    if (!activeConversation) return;

    const updatedConversations = conversations.map((conv) =>
      conv.id === activeConversationId
        ? { ...conv, modelId: model, updatedAt: new Date().toISOString() }
        : conv,
    );

    setConversations(updatedConversations);
  };

  // 处理发送消息
  const handleSendMessage = (content: string) => {
    if (!content.trim() || isLoading || !activeConversation) return;

    // 添加用户消息
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
    };

    // 确保消息正确更新 - 使用函数式更新以避免闭包问题
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

      // 使用更新后的对话
      const updatedConversation = updatedConversations.find(
        (conv) => conv.id === activeConversationId,
      );

      // 设置延迟以确保状态更新后再启动流式处理
      setTimeout(() => {
        if (updatedConversation) {
          setIsLoading(true);
          handleStreamWithEventSource(
            updatedConversation.messages,
            updatedConversation.modelId,
            eventSourceRef,
            setStreamingMessage,
            setIsLoading,
            () => {}, // 不使用updateConversationWithMessage参数
            updatedConversations,
            activeConversationId,
            setConversations,
          );
        }
      }, 0);

      return updatedConversations;
    });
  };

  // 清空当前对话的消息
  const clearMessages = () => {
    if (!activeConversation) return;

    const updatedConversations = conversations.map((conv) =>
      conv.id === activeConversationId
        ? { ...conv, messages: [], updatedAt: new Date().toISOString() }
        : conv,
    );

    setConversations(updatedConversations);
  };

  // 组件卸载时关闭EventSource
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return (
    <main className="flex h-[calc(100vh-4rem)] flex-col md:flex-row">
      {/* 侧边栏: 对话列表 */}
      <ConversationSidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onAddConversation={addNewConversation}
        onDeleteConversation={deleteConversation}
        onSelectConversation={setActiveConversationId}
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
                streamingMessage={streamingMessage}
                isLoading={isLoading}
              />
            </div>

            {/* 输入区域 */}
            <ChatInput
              isLoading={isLoading}
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
