'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Bot, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Message, StreamingMessage } from '../types';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';

interface MessageListProps {
  messages: Message[];
  streamingMessage: StreamingMessage;
  isLoading: boolean;
  conversationId?: string;
}

export function MessageList({
  messages,
  streamingMessage,
  isLoading,
  conversationId,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // 状态管理 - 简化为两个关键状态
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // 滚动到底部的函数 - 使用scrollIntoView提高可靠性
  const scrollToBottom = useCallback(() => {
    if (!endRef.current) return;
    requestAnimationFrame(() => {
      endRef.current!.scrollIntoView({ behavior: 'instant', block: 'end' });
      setShouldAutoScroll(true);
      setShowScrollButton(false);
    });
  }, []);

  // 计算滚动距离底部的像素值
  const getDistanceFromBottom = useCallback(() => {
    if (!containerRef.current) return 0;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    return scrollHeight - scrollTop - clientHeight;
  }, []);

  // 检查是否在底部附近（20px阈值）- 用于自动滚动逻辑
  const isNearBottom = useCallback(() => {
    return getDistanceFromBottom() < 20;
  }, [getDistanceFromBottom]);

  // 检查是否远离底部（100px阈值）- 用于显示返回按钮
  const isFarFromBottom = useCallback(() => {
    return getDistanceFromBottom() > 100;
  }, [getDistanceFromBottom]);

  // 处理滚动事件
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;

    const isAtBottom = isNearBottom();

    // 自动滚动状态更新逻辑
    if (!isAtBottom && shouldAutoScroll) {
      setShouldAutoScroll(false);
    } else if (isAtBottom && !shouldAutoScroll) {
      setShouldAutoScroll(true);
    }

    // 只在远离底部100px以上时显示按钮
    setShowScrollButton(isFarFromBottom());
  }, [isNearBottom, isFarFromBottom, shouldAutoScroll]);

  // 消息或流内容更新时的自动滚动
  useEffect(() => {
    if (shouldAutoScroll) scrollToBottom();
  }, [
    messages,
    streamingMessage.content,
    streamingMessage.thinking,
    shouldAutoScroll,
    scrollToBottom,
  ]);

  // 切换对话窗口时立即滚动到底部 (不使用动画)
  useEffect(() => {
    scrollToBottom();
  }, [conversationId, scrollToBottom]);

  // 响应窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      if (shouldAutoScroll) scrollToBottom();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [shouldAutoScroll, scrollToBottom]);

  // 空消息状态
  if (
    messages.length === 0 &&
    !streamingMessage.content &&
    !streamingMessage.thinking &&
    !isLoading
  ) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <Bot className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-2 text-lg font-medium">开始新的对话</p>
          <p className="text-sm text-muted-foreground">
            发送消息开始与AI助手对话
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <div
        ref={containerRef}
        className="h-full space-y-4 overflow-y-auto scroll-smooth px-1 py-2"
        onScroll={handleScroll}
      >
        {messages.map((message) => (
          <div key={message.id} className="space-y-2">
            {message.role === 'assistant' &&
              message.thinking &&
              message.thinking.trim() !== '' && (
                <div className="flex justify-start">
                  <div className="bg-muted/50 max-w-[85%] rounded-lg border border-dashed p-3 md:max-w-[70%] xl:max-w-[800px]">
                    <div className="text-xs font-medium text-muted-foreground">
                      思考过程
                    </div>
                    <div className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                      {message.thinking}
                    </div>
                  </div>
                </div>
              )}
            <div
              className={cn(
                'flex',
                message.role === 'user' ? 'justify-end' : 'justify-start',
              )}
            >
              <div
                className={cn(
                  'max-w-[85%] rounded-lg px-4 py-2 md:max-w-[70%] xl:max-w-[800px]',
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted',
                )}
              >
                {message.role === 'user' ? (
                  <div className="whitespace-pre-wrap">{message.content}</div>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]}
                      rehypePlugins={[rehypeRaw, rehypeKatex, rehypeHighlight]}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* 流式生成的消息 */}
        {(streamingMessage.content || streamingMessage.thinking) && (
          <div className="space-y-2">
            {streamingMessage.thinking &&
              streamingMessage.thinking.trim() !== '' && (
                <div className="flex justify-start">
                  <div className="bg-muted/50 max-w-[85%] rounded-lg border border-dashed p-3 md:max-w-[70%] xl:max-w-[800px]">
                    <div className="text-xs font-medium text-muted-foreground">
                      思考过程
                    </div>
                    <div className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                      {streamingMessage.thinking}
                    </div>
                  </div>
                </div>
              )}
            {streamingMessage.content && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-lg bg-muted px-4 py-2 md:max-w-[70%] xl:max-w-[800px]">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]}
                      rehypePlugins={[rehypeRaw, rehypeKatex, rehypeHighlight]}
                    >
                      {streamingMessage.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 加载指示器 */}
        {isLoading &&
          !streamingMessage.content &&
          !streamingMessage.thinking && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-lg bg-muted px-4 py-2 md:max-w-[70%] xl:max-w-[800px]">
                <div className="flex space-x-1">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground"></div>
                  <div
                    className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground"
                    style={{ animationDelay: '0.2s' }}
                  ></div>
                  <div
                    className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground"
                    style={{ animationDelay: '0.4s' }}
                  ></div>
                </div>
              </div>
            </div>
          )}
        {/* 滚动参考元素 */}
        <div ref={endRef} className="h-0" />
      </div>

      {/* 返回底部按钮 */}
      {showScrollButton && (
        <Button
          variant="outline"
          size="default"
          className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border bg-card font-semibold text-card-foreground shadow-lg"
          onClick={() => {
            scrollToBottom();
          }}
        >
          <ArrowDown className="mr-1 h-4 w-4" />
          <span className="text-xs">返回底部</span>
        </Button>
      )}
    </div>
  );
}
