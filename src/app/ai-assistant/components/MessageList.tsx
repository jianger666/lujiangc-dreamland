'use client';

import React, { useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Message, StreamingMessage } from './types';

interface MessageListProps {
  messages: Message[];
  streamingMessage: StreamingMessage;
  isLoading: boolean;
}

export function MessageList({
  messages,
  streamingMessage,
  isLoading,
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 对话消息自动滚动
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

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
    <div className="space-y-4">
      {messages.map((message) => (
        <div key={message.id} className="space-y-2">
          {message.role === 'assistant' &&
            message.thinking &&
            message.thinking.trim() !== '' && (
              <Card className="bg-muted/50 border-dashed p-3">
                <div className="text-xs font-medium text-muted-foreground">
                  思考过程
                </div>
                <div className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                  {message.thinking}
                </div>
              </Card>
            )}
          <div
            className={cn(
              'flex',
              message.role === 'user' ? 'justify-end' : 'justify-start',
            )}
          >
            <div
              className={cn(
                'max-w-[85%] rounded-lg px-4 py-2 md:max-w-[70%]',
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted',
              )}
            >
              <div className="whitespace-pre-wrap">{message.content}</div>
            </div>
          </div>
        </div>
      ))}

      {/* 流式生成的消息 */}
      {(streamingMessage.content || streamingMessage.thinking) && (
        <div className="space-y-2">
          {streamingMessage.thinking &&
            streamingMessage.thinking.trim() !== '' && (
              <Card className="bg-muted/50 border-dashed p-3">
                <div className="text-xs font-medium text-muted-foreground">
                  思考过程
                </div>
                <div className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                  {streamingMessage.thinking}
                </div>
              </Card>
            )}
          {streamingMessage.content && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-lg bg-muted px-4 py-2 md:max-w-[70%]">
                <div className="whitespace-pre-wrap">
                  {streamingMessage.content}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 加载指示器 */}
      {isLoading && !streamingMessage.content && !streamingMessage.thinking && (
        <div className="flex justify-start">
          <div className="max-w-[85%] rounded-lg bg-muted px-4 py-2 md:max-w-[70%]">
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
      <div ref={messagesEndRef} />
    </div>
  );
}
