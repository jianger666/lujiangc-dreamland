'use client';

import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Conversation } from '@/types/ai-assistant';
import dayjs from 'dayjs';
import { useAIAssistant } from '../hooks';

// 会话项组件
const ConversationItem = memo(
  ({
    conversation,
    isActive,
    isLoading,
    onSelect,
    onDelete,
  }: {
    conversation: Conversation;
    isActive: boolean;
    isLoading: boolean;
    onSelect: () => void;
    onDelete: (e: React.MouseEvent) => void;
  }) => (
    <div
      key={conversation.id}
      className={cn(
        'group relative flex cursor-pointer items-center rounded-md px-3 py-2 hover:bg-muted',
        isActive && 'bg-muted',
      )}
      onClick={onSelect}
    >
      <div className="flex w-full flex-col gap-1 truncate">
        <div className="flex items-center gap-2 truncate text-sm">
          {isLoading && (
            <LoaderCircle className="h-3 w-3 flex-shrink-0 animate-spin text-primary" />
          )}
          <span className="truncate font-medium">{conversation.title}</span>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {dayjs(conversation.updatedAt).format('YYYY-MM-DD HH:mm:ss')}
          </span>
          <span>{conversation.messages.length} 条消息</span>
        </div>
      </div>

      {/* 删除按钮容器 - 简化嵌套结构 */}
      <div className="bg-background/30 invisible absolute bottom-0 right-0 top-0 flex items-center justify-center rounded-r-md px-2 opacity-0 backdrop-blur-md transition-all duration-150 ease-in-out group-hover:visible group-hover:opacity-100">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="删除对话"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  ),
);

ConversationItem.displayName = 'ConversationItem';

export const ConversationSidebar = memo(() => {
  const {
    conversations,
    activeConversationId,
    streamingState,
    addNewConversation,
    deleteConversation,
    setActiveConversationId,
  } = useAIAssistant();

  return (
    <div className="flex h-full w-full flex-shrink-0 flex-col border-r border-border md:w-64">
      <div className="flex flex-shrink-0 items-center border-b border-border p-3">
        <div className="flex w-full items-center justify-between">
          <h3 className="font-medium">对话列表</h3>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={addNewConversation}
            title="新建对话"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="h-0 flex-1 overflow-y-auto p-3">
        <div className="space-y-2">
          {conversations.map((conversation) => {
            const isLoading = Boolean(
              streamingState[conversation.id]?.isLoading,
            );
            const isActive = activeConversationId === conversation.id;

            return (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isActive={isActive}
                isLoading={isLoading}
                onSelect={() => setActiveConversationId(conversation.id)}
                onDelete={(e) => {
                  e.stopPropagation();
                  deleteConversation(conversation.id);
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
});

ConversationSidebar.displayName = 'ConversationSidebar';
