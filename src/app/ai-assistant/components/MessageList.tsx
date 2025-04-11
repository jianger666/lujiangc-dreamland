'use client';

import React, {
  useRef,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import { Bot, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AiRoleEnum, Message, StreamingMessage } from '@/types/ai-assistant';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import { useTheme } from 'next-themes';
import { Components } from 'react-markdown';
import { useCopy } from '../hooks';
import { VariableSizeList, ListChildComponentProps } from 'react-window';

/**
 * 代码高亮主题组件 - 使用JSX直接加载样式
 */
function HighlightTheme() {
  const { resolvedTheme } = useTheme();

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link
        rel="stylesheet"
        href="/styles/highlight/atom-one-dark.css"
        media={resolvedTheme === 'dark' ? 'all' : 'none'}
      />
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link
        rel="stylesheet"
        href="/styles/highlight/atom-one-light.css"
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
  code({ className, children, ...rest }) {
    const match = /language-(\w+)/.exec(className || '');
    const language = match?.[1];

    if (!language) {
      return (
        <code className={cn(className)} {...rest}>
          {children}
        </code>
      );
    }

    // 创建代码文本提取函数，处理复杂的React元素树
    const extractTextContent = (nodes: React.ReactNode): string => {
      if (!nodes) return '';

      if (typeof nodes === 'string') return nodes;

      if (Array.isArray(nodes)) {
        return nodes.map(extractTextContent).join('');
      }

      // 处理React元素 (如span标签等)
      if (
        typeof nodes === 'object' &&
        nodes !== null &&
        'props' in nodes &&
        typeof nodes.props === 'object' &&
        nodes.props !== null &&
        'children' in nodes.props
      ) {
        return extractTextContent(nodes.props.children as React.ReactNode);
      }

      return '';
    };

    // 提取代码内容
    const codeContent = extractTextContent(children);

    return (
      <div className="relative overflow-hidden rounded-md">
        <div className="flex items-center justify-between bg-card px-4 py-1.5 text-xs text-muted-foreground">
          <span>{language}</span>
          <CopyCodeButton code={codeContent} />
        </div>

        <code
          className={cn(className, 'block w-full overflow-x-auto p-4 text-xs')}
          {...rest}
        >
          {children}
        </code>
      </div>
    );
  },
  pre(props) {
    const { className, ...rest } = props;
    return (
      <pre
        className={cn(className, 'overflow-hidden bg-transparent p-0 text-xs')}
        {...rest}
      />
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
  role: AiRoleEnum;
}) {
  if (role === AiRoleEnum.User) {
    return <div className="whitespace-pre-wrap">{content}</div>;
  }

  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]}
        rehypePlugins={[rehypeRaw, rehypeKatex, rehypeHighlight]}
        components={MarkdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

// 单个消息组件 - 用于虚拟列表
function MessageItem({
  message,
  style,
  setSize,
  index,
}: {
  message: Message | StreamingMessage;
  style: React.CSSProperties;
  setSize: (index: number, size: number) => void;
  index: number;
}) {
  const itemRef = useRef<HTMLDivElement>(null);
  const role = message.role ?? AiRoleEnum.Assistant;
  const thinking = message.thinking ?? undefined;
  const { copied, copyToClipboard } = useCopy();

  // 在组件挂载和更新后更新高度
  useEffect(() => {
    if (itemRef.current) {
      const height = itemRef.current.getBoundingClientRect().height;

      setSize(index, height);
    }
  }, [message.content, thinking, setSize, index]);

  const handleCopy = () => {
    copyToClipboard(message.content);
  };

  return (
    <div style={style}>
      <div ref={itemRef} className="space-y-2 p-3">
        {thinking && <ThinkingBlock content={thinking} />}

        {message.content && (
          <div
            className={cn(
              'group flex',
              role === AiRoleEnum.User ? 'justify-end' : 'justify-start',
            )}
          >
            <div
              className={cn(
                'relative max-w-[85%] rounded-lg px-4 py-2 text-sm md:max-w-[70%] xl:max-w-[800px]',
                role === AiRoleEnum.User
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted',
              )}
            >
              <MessageContent content={message.content} role={role} />

              {/* 复制按钮 - 根据消息位置显示在左侧或右侧 */}
              <div
                className={cn(
                  'absolute top-2 opacity-0 transition-opacity group-hover:opacity-100',
                  role === AiRoleEnum.User ? '-left-10' : '-right-10',
                )}
              >
                <CopyButton onClick={handleCopy} copied={copied} />
              </div>
            </div>
          </div>
        )}
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

interface ItemData {
  messages: (Message | StreamingMessage)[];
  setSize: (index: number, size: number) => void;
  isGenerating: boolean;
  isRequesting: boolean;
}

// 虚拟列表渲染的列表项
const Row = React.memo(
  ({ data, index, style }: ListChildComponentProps<ItemData>) => {
    const { messages, setSize, isRequesting } = data;

    // 显示加载指示器
    if (isRequesting && index === messages.length) {
      return (
        <div style={{ ...style, height: 'auto', minHeight: 50 }}>
          <div className="flex justify-start px-1 py-2">
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
        </div>
      );
    }

    // 显示消息
    return (
      <MessageItem
        message={messages[index]}
        style={style}
        setSize={setSize}
        index={index}
      />
    );
  },
);

Row.displayName = 'VirtualRow';

export function MessageList({
  messages,
  streamingMessage,
  isLoading,
  conversationId,
}: MessageListProps) {
  const listRef = useRef<VariableSizeList>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(0);

  // 创建高度缓存系统 - 使用ref而不是state避免渲染中更新状态
  const itemHeightsRef = useRef<Record<number, number>>({});
  const defaultItemHeight = 80; // 默认高度

  // 有内容或思考过程了
  const isGenerating = useMemo(
    () => !!streamingMessage.content || !!streamingMessage.thinking,
    [streamingMessage],
  );
  // 还处于请求中，没有内容或思考过程，展示加载指示器
  const isRequesting = useMemo(
    () => isLoading && !isGenerating,
    [isLoading, isGenerating],
  );

  // 合并所有消息为一个数组
  const allMessages = useMemo(() => {
    const result: (Message | StreamingMessage)[] = [...messages];

    // 只有存在内容或思考过程时才添加流式消息
    if (isGenerating) result.push(streamingMessage);

    return result;
  }, [messages, streamingMessage, isGenerating]);

  // 计算列表总项数, 如果还处于请求中，则总项数+1（加上指示器的位置）
  const itemCount = allMessages.length + (isRequesting ? 1 : 0);

  // 设置单个项的高度 - 使用useCallback优化性能
  const setSize = useCallback((index: number, size: number) => {
    if (itemHeightsRef.current[index] !== size) {
      itemHeightsRef.current[index] = size;
      listRef.current?.resetAfterIndex(index);
    }
  }, []);

  // 获取项高度的函数
  const getItemHeight = useCallback(
    (index: number) => {
      // 加载指示器不处理高度
      if (isRequesting && index === allMessages.length) return 0;

      return itemHeightsRef.current[index] || defaultItemHeight;
    },
    [defaultItemHeight, isRequesting, allMessages.length],
  );

  // 监听容器尺寸变化
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    const updateHeight = () => {
      setContainerHeight(container.clientHeight);
    };

    updateHeight();

    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.unobserve(container);
    };
  }, []);

  // 重置List组件 - 在对话切换时重置
  useEffect(() => {
    listRef.current?.resetAfterIndex(0);
  }, [conversationId]);

  // 准备虚拟列表的数据
  const itemData: ItemData = {
    messages: allMessages,
    setSize,
    isGenerating,
    isRequesting,
  };

  return (
    <div className="relative h-full" ref={containerRef}>
      <HighlightTheme />
      {messages.length === 0 && !isLoading ? (
        <EmptyState />
      ) : (
        <VariableSizeList
          ref={listRef}
          height={containerHeight}
          width="100%"
          itemCount={itemCount}
          itemSize={getItemHeight}
          itemData={itemData}
          // className="scrollbar-thin scrollbar-thumb-rounded scrollbar-track-transparent scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/30"
          overscanCount={5}
        >
          {Row}
        </VariableSizeList>
      )}
    </div>
  );
}
