'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Send, StopCircle, Globe } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import { cn } from '@/lib/utils';
import { useAIAssistant } from '../hooks';
import { useBreakpoint } from '@/hooks/use-breakpoint';

export function ChatInput() {
  const {
    activeConversation,
    availableModels,
    sendMessage,
    stopResponding,
    changeModel,
    toggleWebSearch,
    currentStreamingState,
  } = useAIAssistant();

  const isDesktop = useBreakpoint('md');

  // 定义文本框行数
  const MIN_TEXTAREA_ROWS = useMemo(() => (isDesktop ? 2 : 1), [isDesktop]);
  const MAX_TEXTAREA_ROWS = useMemo(() => (isDesktop ? 10 : 5), [isDesktop]);

  const { selectedModel = '', isWebSearchEnabled = false } =
    activeConversation || {};

  const isLoading = currentStreamingState.isLoading;

  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [prevIsLoading, setPrevIsLoading] = useState(isLoading);

  // 自动调整文本框高度
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    const scrollHeight = textarea.scrollHeight;
    const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight);
    const maxHeight = lineHeight * MAX_TEXTAREA_ROWS;
    const newHeight = Math.min(
      Math.max(lineHeight * MIN_TEXTAREA_ROWS, scrollHeight),
      maxHeight,
    );

    textarea.style.height = `${newHeight}px`;
  };

  // 输入变化时更新高度
  useEffect(() => {
    adjustTextareaHeight();
  }, [input]);

  // 聚焦输入框
  const focusTextarea = () => {
    if (textareaRef.current && !isLoading) {
      textareaRef.current.focus();
    }
  };

  // 当isLoading从true变为false时自动聚焦
  useEffect(() => {
    if (prevIsLoading && !isLoading) {
      focusTextarea();
    }
    setPrevIsLoading(isLoading);
  }, [isLoading, prevIsLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !activeConversation) return;

    sendMessage(input);
    setInput('');
    // 重置高度
    if (textareaRef.current) {
      textareaRef.current.style.height = `${parseInt(window.getComputedStyle(textareaRef.current).lineHeight) * MIN_TEXTAREA_ROWS}px`;
    }
  };

  // 点击容器时聚焦输入框
  const handleContainerClick = (e: React.MouseEvent) => {
    // 避免与按钮点击冲突
    if (
      e.target instanceof HTMLButtonElement ||
      e.target instanceof HTMLSelectElement ||
      (e.target as HTMLElement).closest('button') ||
      (e.target as HTMLElement).closest('select')
    ) {
      return;
    }

    focusTextarea();
  };

  return (
    <div className="border-t border-border p-3 md:p-4">
      <form onSubmit={handleSubmit}>
        <div
          className={cn(
            'relative rounded-md border border-border transition-all duration-150',
            isFocused && 'border-primary shadow-sm',
          )}
          onClick={handleContainerClick}
        >
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="shift+enter可换行，enter发送消息..."
            disabled={isLoading}
            rows={MIN_TEXTAREA_ROWS}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            enterKeyHint="send"
            onKeyDown={(e) => {
              if (
                e.key === 'Enter' &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing
              ) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />

          <div className="flex items-center justify-between border-border p-2">
            <div className="flex flex-wrap items-center gap-1 md:gap-2">
              <Select
                value={selectedModel}
                onValueChange={changeModel}
                disabled={isLoading}
              >
                <SelectTrigger className="h-7 w-32 text-xs shadow-none focus:ring-0 focus:ring-offset-0 md:h-8 md:w-36">
                  <SelectValue placeholder="选择模型" />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Toggle
                size="sm"
                pressed={isWebSearchEnabled}
                onPressedChange={() =>
                  activeConversation && toggleWebSearch(activeConversation.id)
                }
                disabled={isLoading}
                className="flex h-7 items-center gap-1 text-xs md:h-8"
                variant="outline"
              >
                <Globe className="h-4 w-4" />
                <span className="hidden md:inline-block">联网搜索</span>
              </Toggle>
            </div>

            <div className="flex items-center gap-1 md:gap-2">
              {isLoading && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={stopResponding}
                  className="h-7 w-7 rounded-full p-0 md:h-8 md:w-8"
                  title="停止响应"
                >
                  <StopCircle className="h-3.5 w-3.5 md:h-4 md:w-4" />
                </Button>
              )}
              <Button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="h-7 w-7 rounded-full p-0 md:h-8 md:w-8"
                title="发送消息"
              >
                <Send className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
