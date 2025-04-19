'use client';

import React, { memo, useCallback } from 'react';
import { useAIAssistant } from '../../hooks';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ConversationContent } from './conversation-content';

export const ConversationSidebar = memo(() => {
  const {
    conversations,
    activeConversationId,
    streamingState,
    addNewConversation,
    deleteConversation,
    setActiveConversationId,
    changeSidebarOpen,
    sidebarOpen,
  } = useAIAssistant();

  const isDesktop = useBreakpoint('md');

  const handleSelectConversation = useCallback(
    (conversationId: string) => {
      setActiveConversationId(conversationId);
      if (!isDesktop) changeSidebarOpen(false);
    },
    [isDesktop, setActiveConversationId, changeSidebarOpen],
  );

  const handleDeleteConversation = useCallback(
    (id: string) => {
      deleteConversation(id);
    },
    [deleteConversation],
  );

  const handleAddNewConversation = useCallback(() => {
    addNewConversation();
  }, [addNewConversation]);

  const Content = (
    <ConversationContent
      conversations={conversations}
      activeConversationId={activeConversationId}
      streamingState={streamingState}
      onSelect={handleSelectConversation}
      onDelete={handleDeleteConversation}
      onAddNew={handleAddNewConversation}
    />
  );

  return (
    <>
      {isDesktop ? (
        // 桌面端静态侧边栏
        <div className="flex h-full w-64 flex-shrink-0 flex-col border-r border-border bg-background">
          {Content}
        </div>
      ) : (
        // 移动端使用Sheet组件
        <Sheet
          open={sidebarOpen}
          onOpenChange={(open) => changeSidebarOpen(open)}
        >
          <SheetContent
            side="left"
            className="w-[80%] max-w-[300px] p-0 sm:max-w-xs"
          >
            <div className="flex h-full flex-col">
              <SheetHeader className="px-0">
                <SheetTitle className="sr-only">对话列表</SheetTitle>
              </SheetHeader>
              {Content}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
});

ConversationSidebar.displayName = 'ConversationSidebar';
