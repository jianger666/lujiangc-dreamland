'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Conversation } from './types';

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeConversationId: string;
  onAddConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onSelectConversation: (id: string) => void;
}

export function ConversationSidebar({
  conversations,
  activeConversationId,
  onAddConversation,
  onDeleteConversation,
  onSelectConversation,
}: ConversationSidebarProps) {
  return (
    <div className="flex w-full flex-shrink-0 flex-col overflow-y-auto border-r border-border p-4 md:w-64">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-medium">对话列表</h2>
        <Button variant="outline" size="icon" onClick={onAddConversation}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2">
        {conversations.map((conversation) => (
          <div
            key={conversation.id}
            className={cn(
              'flex cursor-pointer items-center justify-between rounded-md px-3 py-2 hover:bg-muted',
              activeConversationId === conversation.id && 'bg-muted',
            )}
            onClick={() => onSelectConversation(conversation.id)}
          >
            <div className="truncate">{conversation.title}</div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteConversation(conversation.id);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
