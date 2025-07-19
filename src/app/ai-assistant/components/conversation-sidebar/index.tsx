"use client";

import React, { memo, useCallback } from "react";
import { useAIAssistant } from "../../hooks";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ConversationContent } from "./conversationContent";

export const ConversationSidebar = memo(() => {
  const {
    conversations,
    activeConversationId,
    streamingState,
    addNewConversation,
    deleteConversation,
    setActiveConversationId,
    changeMobileSidebarOpen,
    mobileSidebarOpen,
    desktopSidebarOpen,
    changeDesktopSidebarOpen,
  } = useAIAssistant();

  const isDesktop = useBreakpoint("md");

  const handleSelectConversation = useCallback(
    (conversationId: string) => {
      setActiveConversationId(conversationId);
      if (!isDesktop) changeMobileSidebarOpen(false);
    },
    [isDesktop, setActiveConversationId, changeMobileSidebarOpen],
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
      desktopSidebarOpen={desktopSidebarOpen}
      changeDesktopSidebarOpen={changeDesktopSidebarOpen}
      isDesktop={isDesktop}
    />
  );

  return (
    <>
      {isDesktop ? (
        <div
          className={`flex h-full flex-shrink-0 flex-col border-r border-border bg-background transition-all duration-300 ease-in-out ${
            desktopSidebarOpen ? "w-64" : "w-0"
          }`}
        >
          <div className="flex-1 overflow-hidden">{Content}</div>
        </div>
      ) : (
        <Sheet
          open={mobileSidebarOpen}
          onOpenChange={(open) => changeMobileSidebarOpen(open)}
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

ConversationSidebar.displayName = "ConversationSidebar";
