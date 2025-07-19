"use client";

/**
 * AI 助手客户端内容组件
 *
 * 负责呈现AI助手的用户界面，包括消息列表、侧边栏和输入区域
 */

import { useAIAssistant } from "../hooks";
import { Loading } from "@/components/ui/loading";
import { ConversationSidebar } from "./conversation-sidebar";
import { ConversationHeader } from "./ConversationHeader";
import { MessageList } from "./message-list";
import { ChatInput } from "./ChatInput";

export function ClientContent() {
  const { activeConversation, isInitialized } = useAIAssistant();

  // ==== 页面渲染 ====
  return (
    <>
      <Loading
        overlay
        text="加载中..."
        loading={!isInitialized || !activeConversation}
      />
      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        {/* 侧边栏: 对话列表 */}
        <ConversationSidebar />

        {/* 主内容区: 对话界面 */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {activeConversation && (
            <>
              {/* 对话头部: 显示标题、提供编辑功能 */}
              <ConversationHeader />

              {/* 消息列表区域: 显示对话历史和流式响应 */}
              <MessageList />

              {/* 输入区域: 提供消息输入、模型切换和清空对话功能 */}
              <ChatInput />
            </>
          )}
        </div>
      </div>
    </>
  );
}
