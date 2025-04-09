'use client';

import React from 'react';
import { Bot, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Message, StreamingMessage } from '@/types/ai-assistant';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypePrism from 'rehype-prism';
import { useTheme } from 'next-themes';
import { Components } from 'react-markdown';
import { useCopy } from '../hooks';

/**
 * 代码高亮主题组件 - 使用JSX直接加载样式
 */
function PrismTheme() {
  const { resolvedTheme } = useTheme();

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link
        rel="stylesheet"
        href="/styles/prism-one-dark.css"
        media={resolvedTheme === 'dark' ? 'all' : 'none'}
      />
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link
        rel="stylesheet"
        href="/styles/prism-one-light.css"
        media={resolvedTheme === 'dark' ? 'none' : 'all'}
      />
    </>
  );
}

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

// 代码复制按钮组件
function CopyCodeButton({ code }: { code: string }) {
  const { copied, copyToClipboard } = useCopy();

  const handleCopy = () => {
    copyToClipboard(code);
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1 transition-colors hover:text-foreground focus:outline-none"
      aria-label="复制代码"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

// Markdown渲染配置
const MarkdownComponents: Components = {
  code({ className, children, ...props }) {
    return (
      <code className={cn(className, 'text-xs')} {...props}>
        {children}
      </code>
    );
  },
  pre(props) {
    const { className, children } = props;

    const match = /language-(\w+)/.exec(className || '');
    // 检查是否为代码块还是内联代码
    const isCodeBlock = className?.includes('language-');

    if (isCodeBlock && match) {
      let codeContent = '';

      try {
        // 简化实现，直接转换为字符串
        const flattenChildren = (node: React.ReactNode): string => {
          if (node == null) return '';
          if (typeof node === 'string') return node;
          if (typeof node === 'number') return String(node);
          if (Array.isArray(node)) return node.map(flattenChildren).join('');

          // 安全处理React元素
          if (React.isValidElement(node)) {
            const props = node.props as { children?: React.ReactNode };
            return flattenChildren(props.children || '');
          }
          return '';
        };

        codeContent = flattenChildren(children);
      } catch (error) {
        console.error('提取代码内容时出错:', error);
        codeContent = '';
      }

      return (
        <div className="relative overflow-hidden rounded-md">
          <div className="flex items-center justify-between bg-card px-4 py-1.5 text-xs text-muted-foreground">
            <span>{match[1] || 'text'}</span>
            <CopyCodeButton code={codeContent} />
          </div>

          <pre
            {...props}
            className={cn(className, 'm-0 rounded-none p-3 text-xs')}
          />
        </div>
      );
    }

    return <pre {...props} />;
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
        rehypePlugins={[rehypeRaw, rehypeKatex, rehypePrism]}
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
  const { copied, copyToClipboard } = useCopy();

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
          <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" />
          <div
            className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground"
            style={{ animationDelay: '0.2s' }}
          />
          <div
            className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground"
            style={{ animationDelay: '0.4s' }}
          />
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
}: MessageListProps) {
  // 使用自定义的useChatScroll hook来管理滚动行为

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
      <PrismTheme />
      <div className="h-full space-y-4 overflow-y-auto scroll-smooth px-1 py-2">
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
      </div>
    </div>
  );
}
