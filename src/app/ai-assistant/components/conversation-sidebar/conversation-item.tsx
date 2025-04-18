'use client';

import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { LoaderCircle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Conversation } from '@/types/ai-assistant';
import dayjs from 'dayjs';

export const ConversationItem = memo(
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
  }) => {
    return (
      <div
        key={conversation.id}
        className={cn(
          'group relative flex cursor-pointer items-center rounded-md px-2 py-2 hover:bg-muted',
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
            <span>
              {conversation.messages.length > 99
                ? '99+'
                : conversation.messages.length}{' '}
              条消息
            </span>
          </div>
        </div>

        <div className="md:bg-background/70 ml-2 flex transition-opacity duration-200 ease-in-out group-hover:opacity-100 md:absolute md:inset-y-0 md:right-0 md:ml-0 md:flex md:w-12 md:items-center md:justify-center md:rounded-r-md md:opacity-0 md:backdrop-blur-md">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            title="删除对话"
            onClick={onDelete}
          >
            <Trash2 />
          </Button>
        </div>
      </div>
    );
  },
);

ConversationItem.displayName = 'ConversationItem';
