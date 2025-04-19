'use client';

import React, { memo, useMemo, CSSProperties } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCirclePlus } from 'lucide-react';
import { PanelLeftClose } from 'lucide-react';
import { Conversation } from '@/types/ai-assistant';
import dayjs from 'dayjs';
import { ConversationItem } from './conversationItem';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { cn } from '@/lib';

// Define types for itemData
interface ConversationRowData {
  sortedConversations: Conversation[];
  streamingState: Record<string, { isLoading: boolean }>;
  activeConversationId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

// Create the memoized Row component
const ConversationRow = memo(
  ({
    index,
    style,
    data,
  }: {
    index: number;
    style: CSSProperties;
    data: ConversationRowData;
  }) => {
    const {
      sortedConversations,
      streamingState,
      activeConversationId,
      onSelect,
      onDelete,
    } = data;
    const conversation = sortedConversations[index];
    const isLoading = Boolean(streamingState[conversation.id]?.isLoading);
    const isActive = activeConversationId === conversation.id;

    return (
      <div style={style} className="py-1">
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
  },
);
ConversationRow.displayName = 'ConversationRow';

export const ConversationContent = memo(
  ({
    conversations,
    activeConversationId,
    streamingState,
    onSelect,
    onDelete,
    onAddNew,
    desktopSidebarOpen,
    changeDesktopSidebarOpen,
    isDesktop,
  }: {
    conversations: Conversation[];
    activeConversationId: string | null;
    streamingState: Record<string, { isLoading: boolean }>;
    onSelect: (id: string) => void;
    onDelete: (id: string) => void;
    onAddNew: () => void;
    desktopSidebarOpen: boolean;
    changeDesktopSidebarOpen: (open: boolean) => void;
    isDesktop: boolean;
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

    // Create itemData object
    const itemData = useMemo(
      () => ({
        sortedConversations,
        streamingState,
        activeConversationId,
        onSelect,
        onDelete,
      }),
      [
        sortedConversations,
        streamingState,
        activeConversationId,
        onSelect,
        onDelete,
      ],
    );

    return (
      <div className="flex h-full flex-col">
        <div className="flex flex-shrink-0 items-center justify-between border-b border-border p-3">
          <Button variant="ghost" onClick={onAddNew} title="新建对话">
            <MessageCirclePlus />
            <span>新建对话</span>
          </Button>

          {isDesktop && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => changeDesktopSidebarOpen(!desktopSidebarOpen)}
              title="收起侧边栏"
              className={cn(desktopSidebarOpen ? 'flex' : 'hidden')}
            >
              <PanelLeftClose />
            </Button>
          )}
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
                    itemKey={(index) => sortedConversations[index].id}
                    itemData={itemData}
                  >
                    {ConversationRow}
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
      </div>
    );
  },
);

ConversationContent.displayName = 'ConversationContent';
