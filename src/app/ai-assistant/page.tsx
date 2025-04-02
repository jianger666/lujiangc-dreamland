'use client';

/**
 * AI 助手页面组件
 *
 * 该页面提供了一个类似 ChatGPT 的 AI 对话界面，功能包括：
 * - 创建、切换、删除对话
 * - 支持多种 AI 模型选择
 * - 实时流式响应
 * - 自动生成对话标题
 * - 消息历史管理
 */

import React from 'react';
import { ConversationSidebar } from './components/ConversationSidebar';
import { ConversationHeader } from './components/ConversationHeader';
import { MessageList } from './components/MessageList';
import { ChatInput } from './components/ChatInput';
import { EmptyConversation } from './components/EmptyConversation';
import { Loading } from '@/components/ui/loading';
import { AIAssistantProvider } from './providers';
import { useAIAssistant } from './hooks';

// 页面包装组件
export default function AIAssistantPage() {
  return (
    <AIAssistantProvider>
      <AIAssistantContent />
    </AIAssistantProvider>
  );
}

// 内容组件，使用上下文获取状态和方法
function AIAssistantContent() {
  const {
    // 状态
    conversations,
    activeConversationId,
    streamingState,
    isInitialized,
    availableModels,

    // 计算属性
    activeConversation,
    currentStreamingState,

    // 方法
    setActiveConversationId,
    addNewConversation,
    deleteConversation,
    saveEditedTitle,
    changeModel,
    clearMessages,
    sendMessage,
    stopResponding,
  } = useAIAssistant();

  // ==== 页面渲染 ====
  return !isInitialized ? (
    <Loading fullPage text="加载中..." />
  ) : (
    <div className="flex h-0 flex-1 flex-col overflow-auto md:flex-row">
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
            {/* 对话头部: 显示标题、提供编辑功能 */}
            <ConversationHeader
              conversation={activeConversation}
              onSaveTitle={saveEditedTitle}
              onClearMessages={clearMessages}
            />

            {/* 消息列表区域: 显示对话历史和流式响应 */}
            <div className="flex-1 overflow-y-auto px-3">
              <MessageList
                messages={activeConversation.messages}
                streamingMessage={{
                  content: currentStreamingState.content,
                  thinking: currentStreamingState.thinking,
                }}
                isLoading={currentStreamingState.isLoading}
                conversationId={activeConversationId}
              />
            </div>

            {/* 输入区域: 提供消息输入、模型切换和清空对话功能 */}
            <ChatInput
              isLoading={currentStreamingState.isLoading}
              modelId={activeConversation.modelId}
              availableModels={availableModels}
              onSendMessage={sendMessage}
              onStopResponding={stopResponding}
              onChangeModel={changeModel}
            />
          </>
        ) : (
          // 无活跃对话时显示空状态
          <EmptyConversation onCreateConversation={addNewConversation} />
        )}
      </div>
    </div>
  );
}
