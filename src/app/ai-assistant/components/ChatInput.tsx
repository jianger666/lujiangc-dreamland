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
import { Send, Trash2, StopCircle } from 'lucide-react';
import { AIModel } from '../types';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  isLoading: boolean;
  modelId: string;
  availableModels: AIModel[];
  onSendMessage: (content: string) => void;
  onChangeModel: (modelId: string) => void;
  onClearMessages: () => void;
  onStopResponding?: () => void;
}

export function ChatInput({
  isLoading,
  modelId,
  availableModels,
  onSendMessage,
  onChangeModel,
  onClearMessages,
  onStopResponding,
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const [rows, setRows] = useState(3); // 初始行数为3
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 计算文本的行数
  const calculateRows = (text: string) => {
    if (!textareaRef.current) return 3;

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

    // 限制在3-10行之间
    return Math.min(Math.max(totalRows, 3), 10);
  };

  // 输入变化时更新行数
  useEffect(() => {
    const newRows = calculateRows(input);
    if (newRows !== rows) {
      setRows(newRows);
    }
  }, [input, rows]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    onSendMessage(input);
    setInput('');
    setRows(3); // 提交后重置行数
  };

  return (
    <div className="border-t border-border p-4">
      <form onSubmit={handleSubmit}>
        <div
          className={cn(
            'relative rounded-md border border-border transition-all duration-150',
            isFocused && 'border-primary shadow-sm',
          )}
        >
          <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
            <Select value={modelId} onValueChange={onChangeModel}>
              <SelectTrigger className="w-auto border-none shadow-none focus:ring-0 focus:ring-offset-0">
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

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClearMessages}
              title="清空对话"
              className="h-8 px-2 text-xs"
            >
              <Trash2 className="mr-1 h-4 w-4" />
              清空对话
            </Button>
          </div>

          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="发送消息..."
            disabled={isLoading}
            rows={rows}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="resize-none border-0 pb-10 focus-visible:ring-0 focus-visible:ring-offset-0"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />

          <div className="absolute bottom-3 right-3 flex gap-2">
            {isLoading && onStopResponding && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onStopResponding}
                className="h-8 w-8 rounded-full p-0"
                title="停止响应"
              >
                <StopCircle className="h-4 w-4" />
              </Button>
            )}
            <Button
              type="submit"
              size="sm"
              disabled={isLoading || !input.trim()}
              className="h-8 w-8 rounded-full p-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
