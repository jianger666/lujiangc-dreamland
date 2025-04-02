'use client';

import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Conversation, StreamingState } from '../types';

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeConversationId: string;
  streamingState: StreamingState;
  onAddConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onSelectConversation: (id: string) => void;
}

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
        'flex cursor-pointer items-center justify-between rounded-md px-3 py-2 hover:bg-muted',
        isActive && 'bg-muted',
      )}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2 truncate text-sm">
        {isLoading && (
          <LoaderCircle className="h-3 w-3 animate-spin text-primary" />
        )}
        <span className="truncate">{conversation.title}</span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-4 w-4 flex-shrink-0"
        onClick={onDelete}
      >
        <Trash2 />
      </Button>
    </div>
  ),
);

ConversationItem.displayName = 'ConversationItem';

export const ConversationSidebar = memo(
  ({
    conversations,
    activeConversationId,
    streamingState,
    onAddConversation,
    onDeleteConversation,
    onSelectConversation,
  }: ConversationSidebarProps) => {
    return (
      <div className="flex h-full w-full flex-shrink-0 flex-col border-r border-border md:w-64">
        <div className="flex flex-shrink-0 items-center border-b border-border p-3">
          <div className="flex w-full items-center justify-between">
            <h3 className="font-medium">对话列表</h3>
            <Button variant="outline" size="icon" onClick={onAddConversation}>
              <Plus />
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
                  onSelect={() => onSelectConversation(conversation.id)}
                  onDelete={(e) => {
                    e.stopPropagation();
                    onDeleteConversation(conversation.id);
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>
    );
  },
);

ConversationSidebar.displayName = 'ConversationSidebar';
