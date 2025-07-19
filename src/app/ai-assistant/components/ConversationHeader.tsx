"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit, Send, X, Menu, Paintbrush, PanelLeftOpen } from "lucide-react";
import { useAIAssistant } from "../hooks";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { cn } from "@/lib";

export function ConversationHeader() {
  const {
    activeConversation,
    saveEditedTitle,
    clearMessages,
    changeMobileSidebarOpen,
    changeDesktopSidebarOpen,
    desktopSidebarOpen,
  } = useAIAssistant();

  const [editingTitle, setEditingTitle] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const isDesktop = useBreakpoint("md");

  if (!activeConversation) {
    return null;
  }

  const startEditingTitle = () => {
    setEditingTitle(activeConversation.title);
    setIsEditingTitle(true);
  };

  const handleSaveEditedTitle = () => {
    if (!editingTitle.trim()) return;
    saveEditedTitle(editingTitle);
    setIsEditingTitle(false);
  };

  return (
    <div className="flex items-center justify-between border-b border-border p-2">
      <div className="flex items-center space-x-2">
        {/* 移动端打开侧边栏按钮 */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => changeMobileSidebarOpen(true)}
          title="展开侧边栏"
        >
          <Menu />
        </Button>
        {/* 桌面端打开侧边栏按钮 */}
        {isDesktop && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(desktopSidebarOpen ? "hidden" : "flex")}
            onClick={() => changeDesktopSidebarOpen(true)}
            title="展开侧边栏"
          >
            <PanelLeftOpen />
          </Button>
        )}

        {isEditingTitle ? (
          <div className="flex items-center space-x-2">
            <Input
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              className="h-8 w-32 md:w-48"
              autoFocus
              maxLength={10}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveEditedTitle();
              }}
            />
            <Button
              variant="ghost"
              size="icon"
              title="保存标题"
              className="h-8 w-8"
              onClick={handleSaveEditedTitle}
            >
              <Send className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              title="取消编辑"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsEditingTitle(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            <span className="max-w-40 truncate font-medium">
              {activeConversation.title}
            </span>
            <Button
              variant="ghost"
              title="编辑标题"
              size="icon"
              className="h-8 w-8"
              onClick={startEditingTitle}
            >
              <Edit className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      <Button variant="ghost" onClick={clearMessages} title="清空对话">
        <Paintbrush className="h-4 w-4" />
        <span className="ml-1 hidden md:inline-block">清空对话</span>
      </Button>
    </div>
  );
}
