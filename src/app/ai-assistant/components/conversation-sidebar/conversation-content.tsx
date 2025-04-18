'use client';

import React, { memo, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, MessageSquarePlus, MessageCirclePlus } from 'lucide-react';
import { Conversation } from '@/types/ai-assistant';
import dayjs from 'dayjs';
import { ConversationItem } from './conversation-item';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

export const ConversationContent = memo(
  ({
    conversations,
    activeConversationId,
    streamingState,
    onSelect,
    onDelete,
    onAddNew,
  }: {
    conversations: Conversation[];
    activeConversationId: string | null;
    streamingState: Record<string, { isLoading: boolean }>;
    onSelect: (id: string) => void;
    onDelete: (id: string) => void;
    onAddNew: () => void;
  }) => {
    // 按创建时间降序（最新在前）排序对话列表
    const sortedConversations = useMemo(() => {
      return [...conversations].sort((a, b) => {
        const dateA = a.createdAt ? dayjs(a.createdAt).unix() : 0;
        const dateB = b.createdAt ? dayjs(b.createdAt).unix() : 0;

        // 如果创建时间相同，则将最新对话排在最前面
        if (dateA === dateB) return -1;

        return dateB - dateA; // 降序排序
      });
    }, [conversations]);

    // 每个对话项的高度
    const ITEM_HEIGHT = 68;

    // 渲染列表项的函数
    const renderRow = ({
      index,
      style,
    }: {
      index: number;
      style: React.CSSProperties;
    }) => {
      const conversation = sortedConversations[index];
      const isLoading = Boolean(streamingState[conversation.id]?.isLoading);
      const isActive = activeConversationId === conversation.id;

      return (
        <div
          style={{
            ...style,
          }}
          className="py-1"
        >
          <ConversationItem
            conversation={conversation}
            isActive={isActive}
            isLoading={isLoading}
            onSelect={() => onSelect(conversation.id)}
            onDelete={(e) => {
              e.stopPropagation();
              onDelete(conversation.id);
            }}
          />
        </div>
      );
    };

    return (
      <>
        <div className="flex flex-shrink-0 items-center justify-between border-b border-border p-3">
          <Button variant="ghost" onClick={onAddNew} title="新建对话">
            <MessageCirclePlus />
            <span>新建对话</span>
          </Button>
        </div>

        <div className="flex-1 p-3">
          {sortedConversations.length > 0 ? (
            <div className="h-full w-full">
              <AutoSizer>
                {({ height, width }) => (
                  <List
                    height={height}
                    width={width}
                    itemCount={sortedConversations.length}
                    itemSize={ITEM_HEIGHT}
                    overscanCount={3}
                    className="scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted-foreground/30 hover:scrollbar-thumb-muted-foreground/50"
                  >
                    {renderRow}
                  </List>
                )}
              </AutoSizer>
            </div>
          ) : (
            <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
              暂无对话
            </div>
          )}
        </div>
      </>
    );
  },
);

ConversationContent.displayName = 'ConversationContent';
