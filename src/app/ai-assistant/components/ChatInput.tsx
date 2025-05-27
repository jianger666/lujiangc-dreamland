'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Send, StopCircle, Globe, Image as ImageIcon, X } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import { cn } from '@/lib/utils';
import { useAIAssistant } from '../hooks';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useImageUpload } from '../hooks/useImageUpload';
import { useFocusTextarea } from '../hooks/useFocusTextarea';
import { fileToBase64 } from '../utils';

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
  const minTextareaRows = useMemo(() => (isDesktop ? 2 : 1), [isDesktop]);
  const maxTextareaRows = useMemo(() => (isDesktop ? 10 : 5), [isDesktop]);

  const { selectedModel = '', isWebSearchEnabled = false } =
    activeConversation || {};

  const isLoading = currentStreamingState.isLoading;

  const [input, setInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [compressedImageFile, setCompressedImageFile] = useState<File | null>(
    null,
  );

  // 使用图片上传hook
  const {
    imagePreview,
    isProcessingImage,
    handleImageUpload,
    handleUploadButtonClick,
    handleRemoveImage,
    fileInputRef,
  } = useImageUpload({
    onCompressionComplete: ({ success, file }) => {
      if (success && file) {
        setCompressedImageFile(file);
      } else {
        setCompressedImageFile(null);
      }
    },
  });

  // 使用文本框聚焦hook
  const { textareaRef, focusTextarea } = useFocusTextarea({
    isLoading,
    conversationId: activeConversation?.id,
    messagesLength: activeConversation?.messages?.length,
  });

  // 处理粘贴事件
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const files = e.clipboardData.files;
      if (files.length === 0) return;

      // 查找第一个图片文件
      const imageFile = Array.from(files).find((file) =>
        file.type.startsWith('image/'),
      );

      if (imageFile) {
        // 阻止默认粘贴行为
        e.preventDefault();
        // 调用现有的图片上传处理
        handleImageUpload(imageFile);
      }
      // 如果没有图片文件，保持默认的文本粘贴行为
    },
    [handleImageUpload],
  );

  // 自动调整文本框高度
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    const scrollHeight = textarea.scrollHeight;
    const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight);
    const maxHeight = lineHeight * maxTextareaRows;
    const newHeight = Math.min(
      Math.max(lineHeight * minTextareaRows, scrollHeight),
      maxHeight,
    );

    textarea.style.height = `${newHeight}px`;
  }, [maxTextareaRows, minTextareaRows]);

  // 输入变化时更新高度
  useEffect(() => {
    adjustTextareaHeight();
  }, [input, adjustTextareaHeight]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if ((!input.trim() && !imagePreview) || isLoading || !activeConversation)
        return;

      // 如果有压缩后的图片文件，转换为base64发送
      if (compressedImageFile) {
        fileToBase64(compressedImageFile).then((base64Data) => {
          sendMessage(input, base64Data);
          setInput('');
          handleRemoveImage();
          setCompressedImageFile(null);

          // 重置高度
          if (textareaRef.current) {
            textareaRef.current.style.height = `${parseInt(window.getComputedStyle(textareaRef.current).lineHeight) * minTextareaRows}px`;
          }
        });
      } else {
        sendMessage(input, undefined);
        setInput('');

        // 重置高度
        if (textareaRef.current) {
          textareaRef.current.style.height = `${parseInt(window.getComputedStyle(textareaRef.current).lineHeight) * minTextareaRows}px`;
        }
      }
    },
    [
      input,
      imagePreview,
      isLoading,
      activeConversation,
      compressedImageFile,
      sendMessage,
      handleRemoveImage,
      textareaRef,
      minTextareaRows,
    ],
  );

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
        >
          {/* 图片预览区域 */}
          {imagePreview && (
            <div className="relative mx-2 mt-2 inline-block">
              <div className="group relative h-20 w-20 overflow-hidden rounded-md border border-border">
                <Image
                  src={imagePreview}
                  alt="预览图片"
                  fill
                  className="object-cover"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute right-1 top-1 h-5 w-5 rounded-full p-0 opacity-80 transition-opacity hover:opacity-100"
                  onClick={handleRemoveImage}
                  title="移除图片"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}

          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="shift+enter可换行，enter发送消息..."
            disabled={isLoading}
            rows={minTextareaRows}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onPaste={handlePaste}
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

          <div
            className="flex items-center justify-between border-border p-2"
            onClick={handleContainerClick}
          >
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

              {/* 图片上传按钮 */}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleUploadButtonClick}
                disabled={isLoading || isProcessingImage}
                className="h-7 px-2 text-xs md:h-8"
                title="上传图片"
              >
                <ImageIcon className="mr-1 h-4 w-4" />
                <span className="hidden md:inline-block">上传图片</span>
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={(e) => handleImageUpload(e.target.files?.[0] || null)}
                disabled={isLoading}
              />
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
                disabled={isLoading || (!input.trim() && !imagePreview)}
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
