'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Send, StopCircle } from 'lucide-react';
import { AIModel } from '../types';
import { cn } from '@/lib/utils';

// 定义文本框行数的常量
const MIN_TEXTAREA_ROWS = 2;
const MAX_TEXTAREA_ROWS = 10;

interface ChatInputProps {
  isLoading: boolean;
  modelId: string;
  availableModels: AIModel[];
  onSendMessage: (content: string) => void;
  onChangeModel: (modelId: string) => void;
  onStopResponding?: () => void;
}

export function ChatInput({
  isLoading,
  modelId,
  availableModels,
  onSendMessage,
  onChangeModel,
  onStopResponding,
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const [rows, setRows] = useState(MIN_TEXTAREA_ROWS); // 初始行数
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [prevIsLoading, setPrevIsLoading] = useState(isLoading);

  // 计算文本的行数
  const calculateRows = (text: string) => {
    if (!textareaRef.current) return MIN_TEXTAREA_ROWS;

    const textarea = textareaRef.current;
    const style = window.getComputedStyle(textarea);
    const lineHeight = parseInt(style.lineHeight);
    const paddingTop = parseInt(style.paddingTop);
    const paddingBottom = parseInt(style.paddingBottom);
    const borderTop = parseInt(style.borderTopWidth);
    const borderBottom = parseInt(style.borderBottomWidth);

    // 获取换行符数量
    const newlineCount = (text.match(/\n/g) || []).length;

    // 计算因容器宽度导致的自动换行
    textarea.style.height = 'auto'; // 临时重置高度以获取正确的scrollHeight
    const scrollHeight = textarea.scrollHeight;
    const visibleHeight =
      scrollHeight - paddingTop - paddingBottom - borderTop - borderBottom;
    const wrappedLines = Math.ceil(visibleHeight / lineHeight);

    // 总行数 = 换行符数量 + 1 (初始行) + 自动换行行数
    // 但我们用wrappedLines已经包含了所有行，所以不需要额外加上newlineCount
    const totalRows = Math.max(wrappedLines, newlineCount + 1);

    // 限制在MIN_TEXTAREA_ROWS-MAX_TEXTAREA_ROWS行之间
    return Math.min(Math.max(totalRows, MIN_TEXTAREA_ROWS), MAX_TEXTAREA_ROWS);
  };

  // 聚焦输入框
  const focusTextarea = () => {
    if (textareaRef.current && !isLoading) {
      textareaRef.current.focus();
    }
  };

  // 输入变化时更新行数
  useEffect(() => {
    const newRows = calculateRows(input);
    if (newRows !== rows) {
      setRows(newRows);
    }
  }, [input, rows]);

  // 当isLoading从true变为false时自动聚焦
  useEffect(() => {
    if (prevIsLoading && !isLoading) {
      focusTextarea();
    }
    setPrevIsLoading(isLoading);
  }, [isLoading, prevIsLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    onSendMessage(input);
    setInput('');
    setRows(MIN_TEXTAREA_ROWS); // 提交后重置行数
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
    <div className="border-t border-border p-4">
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
            placeholder="shift+enter可换行，发送消息..."
            disabled={isLoading}
            rows={rows}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
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
            <Select value={modelId} onValueChange={onChangeModel}>
              <SelectTrigger className="h-8 w-auto shadow-none focus:ring-0 focus:ring-offset-0">
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

            <div className="flex items-center gap-2">
              {isLoading && onStopResponding && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={onStopResponding}
                  className="h-8 w-8 rounded-full p-0"
                  title="停止响应"
                >
                  <StopCircle className="h-4 w-4" />
                </Button>
              )}
              <Button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="h-8 w-8 rounded-full p-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
