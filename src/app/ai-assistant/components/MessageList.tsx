'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Bot, ArrowDown, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Message, StreamingMessage } from '../types';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
// 使用Next.js内置的代码高亮组件（基于prism.js）
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import {
  oneLight,
  oneDark,
} from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from 'next-themes';
import { Components } from 'react-markdown';
import { useCopyToClipboard } from '../hooks/useCopy';

/**
 * 复制按钮组件
 */
interface CopyButtonProps {
  onClick: () => void;
  copied: boolean;
  className?: string;
}

export function CopyButton({
  onClick,
  copied,
  className = '',
}: CopyButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`bg-background/80 rounded-full p-1.5 text-muted-foreground backdrop-blur-sm transition-colors hover:bg-background hover:text-foreground focus:outline-none ${className}`}
      aria-label="复制消息"
      title="复制消息"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

// 代码高亮组件，带有语言显示和复制功能
function CodeBlock({
  language,
  children,
}: {
  language: string;
  children: string;
}) {
  const { resolvedTheme } = useTheme();
  const { copied, copyToClipboard } = useCopyToClipboard();
  const style = (resolvedTheme === 'dark' ? oneDark : oneLight) as Record<
    string,
    React.CSSProperties
  >;

  const handleCopy = () => {
    copyToClipboard(children);
  };

  const displayLanguage = language || 'text';

  return (
    <div className="relative overflow-hidden rounded-md">
      <div className="flex items-center justify-between bg-card px-4 py-1.5 text-xs text-muted-foreground">
        <span>{displayLanguage}</span>
        <button
          onClick={handleCopy}
          className="p-1 transition-colors hover:text-foreground focus:outline-none"
          aria-label="复制代码"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={style}
        PreTag="div"
        customStyle={{
          fontSize: '0.9rem',
          lineHeight: '1.5',
          margin: 0,
          borderRadius: '0 0 0.375rem 0.375rem',
        }}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
}

// Markdown渲染配置
const MarkdownComponents: Components = {
  code({ className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || '');
    // 检查是否为代码块还是内联代码
    const isCodeBlock = className?.includes('language-');

    if (isCodeBlock && match) {
      return (
        <CodeBlock language={match[1]}>
          {String(children).replace(/\n$/, '')}
        </CodeBlock>
      );
    }

    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  },
  pre({ children, className, ...props }) {
    return (
      <pre className={cn(className, 'p-0', 'bg-transparent')} {...props}>
        {children}
      </pre>
    );
  },
};

// 思考过程组件
function ThinkingBlock({ content }: { content: string }) {
  if (!content || content.trim() === '') return null;

  return (
    <div className="flex justify-start">
      <div className="bg-muted/50 max-w-[85%] rounded-lg border border-dashed p-3 text-xs md:max-w-[70%] xl:max-w-[800px]">
        <div className="text-xs font-medium text-muted-foreground">
          思考过程
        </div>
        <div className="mt-1 whitespace-pre-wrap text-muted-foreground">
          {content}
        </div>
      </div>
    </div>
  );
}

// 消息内容组件
function MessageContent({
  content,
  role,
}: {
  content: string;
  role: 'user' | 'assistant' | 'system';
}) {
  if (role === 'user') {
    return <div className="whitespace-pre-wrap">{content}</div>;
  }

  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]}
        rehypePlugins={[rehypeRaw, rehypeKatex]}
        components={MarkdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

// 单个消息组件
function MessageItem({ message }: { message: Message | StreamingMessage }) {
  const role = 'role' in message ? message.role : 'assistant';
  const thinking = 'thinking' in message ? message.thinking : undefined;
  const { copied, copyToClipboard } = useCopyToClipboard();

  const handleCopy = () => {
    copyToClipboard(message.content);
  };

  return (
    <div className="space-y-2">
      {thinking && <ThinkingBlock content={thinking} />}

      {message.content && (
        <div
          className={cn(
            'group flex',
            role === 'user' ? 'justify-end' : 'justify-start',
          )}
        >
          <div
            className={cn(
              'relative max-w-[85%] rounded-lg px-4 py-2 text-sm md:max-w-[70%] xl:max-w-[800px]',
              role === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted',
            )}
          >
            <MessageContent content={message.content} role={role} />

            {/* 复制按钮 - 根据消息位置显示在左侧或右侧 */}
            <div
              className={cn(
                'absolute top-2 opacity-0 transition-opacity group-hover:opacity-100',
                role === 'user' ? '-left-10' : '-right-10',
              )}
            >
              <CopyButton onClick={handleCopy} copied={copied} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 加载指示器组件
function LoadingIndicator() {
  return (
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
  );
}

// 空状态组件
function EmptyState() {
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

  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const scrollToBottom = useCallback(() => {
    if (!endRef.current) return;
    requestAnimationFrame(() => {
      endRef.current!.scrollIntoView({ behavior: 'instant', block: 'end' });
      setShouldAutoScroll(true);
      setShowScrollButton(false);
    });
  }, []);

  const getDistanceFromBottom = useCallback(() => {
    if (!containerRef.current) return 0;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    return scrollHeight - scrollTop - clientHeight;
  }, []);

  const isNearBottom = useCallback(() => {
    return getDistanceFromBottom() < 20;
  }, [getDistanceFromBottom]);

  const isFarFromBottom = useCallback(() => {
    return getDistanceFromBottom() > 100;
  }, [getDistanceFromBottom]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;

    const isAtBottom = isNearBottom();

    if (!isAtBottom && shouldAutoScroll) {
      setShouldAutoScroll(false);
    } else if (isAtBottom && !shouldAutoScroll && isLoading) {
      setShouldAutoScroll(true);
    }

    setShowScrollButton(isFarFromBottom());
  }, [isNearBottom, isFarFromBottom, shouldAutoScroll, isLoading]);

  useEffect(() => {
    if (shouldAutoScroll) scrollToBottom();
  }, [
    messages,
    streamingMessage.content,
    streamingMessage.thinking,
    shouldAutoScroll,
    scrollToBottom,
  ]);

  useEffect(() => {
    scrollToBottom();
  }, [conversationId, scrollToBottom]);

  useEffect(() => {
    const handleResize = () => {
      if (shouldAutoScroll) scrollToBottom();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [shouldAutoScroll, scrollToBottom]);

  // 没有消息时显示空状态
  if (
    messages.length === 0 &&
    !streamingMessage.content &&
    !streamingMessage.thinking &&
    !isLoading
  ) {
    return <EmptyState />;
  }

  return (
    <div className="relative h-full">
      <div
        ref={containerRef}
        className="h-full space-y-4 overflow-y-auto scroll-smooth px-1 py-2"
        onScroll={handleScroll}
      >
        {messages.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}

        {/* 流式生成的消息 */}
        {(streamingMessage.content || streamingMessage.thinking) && (
          <MessageItem message={streamingMessage} />
        )}

        {/* 加载指示器 */}
        {isLoading &&
          !streamingMessage.content &&
          !streamingMessage.thinking && <LoadingIndicator />}

        {/* 滚动参考元素 */}
        <div ref={endRef} className="h-0" />
      </div>

      {/* 返回底部按钮 */}
      {showScrollButton && (
        <Button
          variant="outline"
          size="default"
          className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border bg-card font-semibold text-card-foreground shadow-lg"
          onClick={scrollToBottom}
        >
          <ArrowDown className="mr-1 h-4 w-4" />
          <span className="text-xs">返回底部</span>
        </Button>
      )}
    </div>
  );
}
