'use client';

/**
 * AI 助手客户端内容组件
 *
 * 负责呈现AI助手的用户界面，包括消息列表、侧边栏和输入区域
 */

import { useAIAssistant } from '../hooks';
import { Loading } from '@/components/ui/loading';
import { ConversationSidebar } from './ConversationSidebar';
import { ConversationHeader } from './ConversationHeader';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { useEffect } from 'react';

export function ClientContent() {
  const {
    // 状态
    conversations,
    activeConversationId,
    activeConversation,
    streamingState,
    isInitialized,
    availableModels,

    // 计算属性
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

  // ==== 页面渲染 ====
  return !isInitialized || !activeConversation ? (
    <Loading fullPage text="加载中..." />
  ) : (
    <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
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
        {activeConversation && (
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
        )}
      </div>
    </div>
  );
}
