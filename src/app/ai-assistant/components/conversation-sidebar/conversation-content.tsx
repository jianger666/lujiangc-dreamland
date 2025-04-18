'use client';

import React, { memo, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';
import { Conversation } from '@/types/ai-assistant';
import dayjs from 'dayjs';
import { ConversationItem } from './conversation-item';

export const ConversationContent = memo(
  ({
    conversations,
    activeConversationId,
    streamingState,
    onSelect,
    onDelete,
    onAddNew,
    onClose,
  }: {
    conversations: Conversation[];
    activeConversationId: string | null;
    streamingState: Record<string, { isLoading: boolean }>;
    onSelect: (id: string) => void;
    onDelete: (id: string) => void;
    onAddNew: () => void;
    onClose?: () => void;
  }) => {
    // 按创建时间降序（最新在前）排序对话列表
    const sortedConversations = useMemo(() => {
      return [...conversations].sort((a, b) => {
        const dateA = a.createdAt ? dayjs(a.createdAt).unix() : 0;
        const dateB = b.createdAt ? dayjs(b.createdAt).unix() : 0;
        return dateB - dateA; // 降序排序
      });
    }, [conversations]);

    return (
      <>
        <div className="flex flex-shrink-0 items-center justify-between border-b border-border p-3">
          <h3 className="font-medium">对话列表</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={onAddNew}
              title="新建对话"
            >
              <Plus className="h-4 w-4" />
            </Button>
            {/* 移动端关闭按钮 - 仅在Sheet中的静态侧边栏显示 */}
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 md:hidden"
                onClick={onClose}
                title="关闭菜单"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="h-0 flex-1 overflow-y-auto p-2">
          <div className="space-y-2">
            {sortedConversations.map((conversation) => {
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
                  onSelect={() => onSelect(conversation.id)}
                  onDelete={(e) => {
                    e.stopPropagation();
                    onDelete(conversation.id);
                  }}
                />
              );
            })}
          </div>
        </div>
      </>
    );
  },
);

ConversationContent.displayName = 'ConversationContent';
