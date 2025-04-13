'use client';

import React, {
  useRef,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import { Bot, Copy, Check, ChevronsDown } from 'lucide-react';
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
import { DotLoading } from '@/components/ui/dot-loading';
import { Button } from '@/components/ui/button';

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
 * 通用复制按钮组件
 */
interface CopyButtonProps {
  textToCopy: string;
  className?: string;
  title?: string;
}

export function CopyButton({
  textToCopy,
  className = '',
  title = '复制',
}: CopyButtonProps) {
  const { copied, copyToClipboard } = useCopy();

  const handleCopy = () => {
    copyToClipboard(textToCopy);
  };

  return (
    <Button
      onClick={handleCopy}
      type="button"
      variant="ghost"
      size="icon"
      className={cn('h-6 w-6', className)}
      title={title}
    >
      {copied ? <Check /> : <Copy />}
    </Button>
  );
}

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
  const MarkdownComponents: Components = {
    table({ className, ...rest }) {
      return <table className={cn(className, 'border-collapse')} {...rest} />;
    },
    th({ className, ...rest }) {
      return (
        <th
          className={cn(
            className,
            'border border-foreground bg-muted bg-opacity-50 p-2',
          )}
          {...rest}
        />
      );
    },
    td({ className, ...rest }) {
      return (
        <td
          className={cn(className, 'border border-foreground p-2')}
          {...rest}
        />
      );
    },
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
          <div
            className={cn(
              role === AiRoleEnum.User ? 'bg-muted' : 'bg-accent',
              'flex items-center justify-between px-4 py-1.5 text-xs text-muted-foreground',
            )}
          >
            <span>{language}</span>
            <CopyButton textToCopy={codeContent} title="复制代码" />
          </div>

          <code
            className={cn(
              className,
              'block w-full overflow-x-auto p-4 text-xs',
            )}
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
          className={cn(
            className,
            'overflow-hidden bg-transparent p-0 text-xs',
          )}
          {...rest}
        />
      );
    },
  };

  // 使用相同的Markdown渲染逻辑，但为用户消息设置不同的样式类
  return (
    <div
      className={cn(
        'prose prose-sm max-w-none',
        role === AiRoleEnum.User
          ? 'prose-white dark:prose-invert'
          : 'dark:prose-invert',
      )}
    >
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

  // 动态更新项目高度
  useEffect(() => {
    if (itemRef.current) {
      // 使用 scrollHeight 获取包含所有内容的实际高度，可能比 getBoundingClientRect 更准确
      const measuredHeight = itemRef.current.scrollHeight;
      // 检查是否需要添加额外的 padding/margin，根据 itemRef 内部的 padding 调整
      // 当前 className="space-y-2 px-3 py-2" 意味着上下各有 8px padding
      // scrollHeight 应该已经包含了这些，所以可能不需要额外加 16
      const requiredHeight = measuredHeight; // 直接使用 scrollHeight

      // 仅在高度有效且发生变化时更新
      if (requiredHeight > 0) {
        // console.log(`[MessageItem ${index}] Measured height: ${measuredHeight}, Setting size to: ${requiredHeight}`);
        setSize(index, requiredHeight);
      }
    }
    // 依赖项：当消息内容或思考内容变化时重新计算
  }, [message.content, thinking, setSize, index]);

  return (
    <div style={style}>
      {/* 将 padding 应用在内部 div 上，以便 itemRef 能正确测量 */}
      <div ref={itemRef} className="px-3 py-2">
        {/* 应用垂直 padding */}
        <div className="space-y-2">
          {/* 使用 space-y 控制间距 */}
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
                  role === AiRoleEnum.User ? 'bg-accent' : 'bg-muted',
                )}
              >
                <MessageContent content={message.content} role={role} />
                {/* 复制按钮 */}
                <div
                  className={cn(
                    'absolute top-1 transition-opacity group-hover:opacity-100',
                    'opacity-0', // 初始隐藏
                    role === AiRoleEnum.User ? '-left-10' : '-right-10',
                    'flex items-center',
                  )}
                >
                  <CopyButton textToCopy={message.content} title="复制消息" />
                </div>
              </div>
            </div>
          )}
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

interface ItemData {
  messages: (Message | StreamingMessage)[];
  setSize: (index: number, size: number) => void;
  isRequesting: boolean;
}

// 虚拟列表渲染的列表项
const Row = React.memo(
  ({ data, index, style }: ListChildComponentProps<ItemData>) => {
    const { messages, setSize, isRequesting } = data;

    // 加载指示器行
    if (isRequesting && index === messages.length) {
      return (
        <div
          style={{
            ...style,
            display: 'flex',
            justifyContent: 'flex-start',
            padding: '8px 12px', // 保持内边距一致性
          }}
        >
          <div className="rounded-lg bg-muted px-4 py-2">
            <DotLoading />
          </div>
        </div>
      );
    }

    // 渲染普通消息项
    if (index < messages.length) {
      return (
        <MessageItem
          message={messages[index]}
          style={style}
          setSize={setSize}
          index={index}
        />
      );
    }

    // 边界情况处理
    return <div style={style}></div>;
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
  const outerRef = useRef<HTMLDivElement>(null); // 外部滚动容器 ref
  const [containerHeight, setContainerHeight] = useState(0);
  // **状态简化**: 使用一个 ref 来跟踪滚动状态，减少不必要的重渲染
  const scrollStateRef = useRef({
    userScrolledUp: false, // 用户是否主动向上滚动
    isNearBottom: true, // 当前是否接近底部
    programmaticScroll: false, // 是否是程序化滚动触发的事件
  });
  // 仅保留控制按钮显示的 state
  const [showScrollToBottomButton, setShowScrollToBottomButton] =
    useState(false);

  const itemHeightsRef = useRef<Record<number, number>>({});
  const defaultItemHeight = 60; // 稍微减小默认高度估计

  const isGenerating = useMemo(
    () => !!streamingMessage.content || !!streamingMessage.thinking,
    [streamingMessage],
  );

  const isRequesting = useMemo(
    () => isLoading && !isGenerating,
    [isLoading, isGenerating],
  );

  const allMessages = useMemo(() => {
    const result: (Message | StreamingMessage)[] = [...messages];
    if (isGenerating) result.push(streamingMessage);
    return result;
  }, [messages, streamingMessage, isGenerating]);

  // 包含加载指示器的总项目数
  const itemCount = allMessages.length + (isRequesting ? 1 : 0);

  // 更新项目高度的回调函数
  const setSize = useCallback((index: number, size: number) => {
    const currentHeight = itemHeightsRef.current[index];
    // 仅当高度实际变化时才更新并重置列表缓存
    if (currentHeight !== size) {
      itemHeightsRef.current[index] = size;
      // console.log(`[setSize ${index}] New size: ${size}. Resetting list.`);
      // 确保 listRef 存在再调用 resetAfterIndex
      if (listRef.current) {
        // 标记为程序化更新，避免触发 handleScroll 中的用户滚动逻辑
        scrollStateRef.current.programmaticScroll = true;
        listRef.current.resetAfterIndex(index, false); // 第二个参数 false 表示不立即滚动到该项
        // 短暂延迟后解除标记，允许后续滚动事件正常处理
        setTimeout(() => {
          scrollStateRef.current.programmaticScroll = false;
        }, 50);
      }
    }
  }, []); // 移除 itemCount 依赖，setSize 本身不应依赖于 itemCount

  // 获取项目高度的回调函数
  const getItemHeight = useCallback(
    (index: number) => {
      // 加载指示器的高度
      if (isRequesting && index === allMessages.length) return 40;
      return itemHeightsRef.current[index] || defaultItemHeight;
    },
    [isRequesting, allMessages.length],
  );

  // 滚动到底部的函数 (简化版)
  const scrollToBottom = useCallback(
    (behavior: 'auto' | 'smooth' = 'auto') => {
      if (itemCount > 0 && listRef.current) {
        // console.log(`[scrollToBottom] Scrolling to index ${itemCount - 1} with behavior: ${behavior}`);
        // 标记为程序化滚动
        scrollStateRef.current.programmaticScroll = true;
        listRef.current.scrollToItem(itemCount - 1, 'end'); // 直接滚动，使用 'end' 对齐

        // 重置滚动状态标记 (因为我们强制滚动到底部了)
        scrollStateRef.current.userScrolledUp = false;
        scrollStateRef.current.isNearBottom = true;
        setShowScrollToBottomButton(false); // 隐藏按钮

        // 延迟解除标记，允许滚动动画完成（如果是 smooth）
        const delay = behavior === 'smooth' ? 300 : 50;
        setTimeout(() => {
          scrollStateRef.current.programmaticScroll = false;
          // console.log('[scrollToBottom] Programmatic scroll flag reset.');
        }, delay);
      }
    },
    [itemCount], // 依赖 itemCount
  );

  // 容器高度监听
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const resizeObserver = new ResizeObserver(() => {
      const newHeight = container.clientHeight;
      if (newHeight > 0 && newHeight !== containerHeight) {
        // console.log(`[ResizeObserver] Container height changed to: ${newHeight}`);
        setContainerHeight(newHeight);
      }
    });
    resizeObserver.observe(container);
    // 初次设置高度
    const initialHeight = container.clientHeight;
    if (initialHeight > 0) setContainerHeight(initialHeight);

    return () => resizeObserver.unobserve(container);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 确保只运行一次

  // 对话 ID 变化时的重置逻辑
  useEffect(() => {
    // console.log('[useEffect conversationId] Resetting state for new conversation.');
    itemHeightsRef.current = {}; // 清空高度缓存
    listRef.current?.resetAfterIndex(0, false); // 重置列表状态，不滚动

    // 重置滚动状态
    scrollStateRef.current.userScrolledUp = false;
    scrollStateRef.current.isNearBottom = true;
    scrollStateRef.current.programmaticScroll = false;
    setShowScrollToBottomButton(false);

    // 稍微延迟后滚动到底部，确保列表重置完成
    // 移除 setTimeout, 让自动滚动逻辑处理
    // const timer = setTimeout(() => {
    //   console.log('[useEffect conversationId] Scrolling to bottom after reset.');
    //   scrollToBottom('auto');
    // }, 50); // 短暂延迟

    // return () => clearTimeout(timer);
  }, [conversationId]); // 只依赖 conversationId

  // 自动滚动逻辑 - 当消息列表变化且用户在底部时
  useEffect(() => {
    // console.log(`[useEffect itemCount] itemCount: ${itemCount}, isNearBottom: ${scrollStateRef.current.isNearBottom}, userScrolledUp: ${scrollStateRef.current.userScrolledUp}`);
    // 只有当用户接近底部且没有主动向上滚动时才自动滚动
    if (
      scrollStateRef.current.isNearBottom &&
      !scrollStateRef.current.userScrolledUp
    ) {
      // console.log('[useEffect itemCount] Auto-scrolling to bottom.');
      scrollToBottom('auto');
    }
    // 当 itemCount 变化时（即消息增删），重新评估是否需要滚动
  }, [itemCount, scrollToBottom]); // 依赖 itemCount 和 scrollToBottom

  // 滚动事件处理
  const handleScroll = useCallback(
    ({
      scrollOffset, // 当前滚动位置
      scrollUpdateWasRequested, // 是否由 scrollToItem 等程序化调用触发
    }: {
      scrollOffset: number;
      scrollUpdateWasRequested: boolean;
    }) => {
      // 如果是 resetAfterIndex 或 scrollToBottom 触发的滚动，则忽略
      if (
        scrollUpdateWasRequested ||
        scrollStateRef.current.programmaticScroll
      ) {
        // console.log(`[handleScroll] Ignored programmatic scroll. requested=${scrollUpdateWasRequested}, flag=${scrollStateRef.current.programmaticScroll}`);
        // 如果是程序化滚动到底部，确保 isNearBottom 状态正确
        if (scrollUpdateWasRequested && scrollOffset > 0) {
          // 简单的检查，确保不是初始 0
          // Find approximate total height
          let totalHeight = 0;
          for (let i = 0; i < itemCount; i++) {
            totalHeight += getItemHeight(i);
          }
          if (
            outerRef.current &&
            totalHeight - scrollOffset - outerRef.current.clientHeight < 10
          ) {
            scrollStateRef.current.isNearBottom = true;
            scrollStateRef.current.userScrolledUp = false;
          }
        }
        return;
      }

      if (!outerRef.current || !listRef.current) return;

      const listElement = outerRef.current;
      const scrollHeight = listElement.scrollHeight; // 总可滚动高度
      const clientHeight = listElement.clientHeight; // 可见区域高度

      // 计算距离底部的距离
      const scrollBottom = scrollHeight - clientHeight - scrollOffset;

      // 判断是否接近底部 (阈值可以调整，例如 10 像素)
      const currentlyNearBottom = scrollBottom < 10;

      // 更新内部 ref 状态
      scrollStateRef.current.isNearBottom = currentlyNearBottom;

      // console.log(`[handleScroll] User scroll: offset=${scrollOffset.toFixed(0)}, H=${scrollHeight.toFixed(0)}, clientH=${clientHeight.toFixed(0)}, bottomDist=${scrollBottom.toFixed(0)}, nearBottom=${currentlyNearBottom}`);

      // 判断用户是否主动向上滚动
      // 如果当前不在底部，并且之前认为在底部 或 之前没有标记为向上滚动
      if (!currentlyNearBottom && !scrollStateRef.current.userScrolledUp) {
        // console.log('[handleScroll] User scrolled up.');
        scrollStateRef.current.userScrolledUp = true;
      }
      // 如果当前回到了底部，并且之前标记为向上滚动
      else if (currentlyNearBottom && scrollStateRef.current.userScrolledUp) {
        // console.log('[handleScroll] User scrolled back to bottom.');
        scrollStateRef.current.userScrolledUp = false;
      }

      // 控制"滚动到底部"按钮的显示
      // 当用户滚动离开底部超过一定距离时显示 (例如 100 像素)
      const showButtonThreshold = 100;
      const shouldShowButton =
        !currentlyNearBottom && scrollBottom >= showButtonThreshold;

      if (shouldShowButton !== showScrollToBottomButton) {
        // console.log(`[handleScroll] Setting showScrollToBottomButton to: ${shouldShowButton}`);
        setShowScrollToBottomButton(shouldShowButton);
      }

      // 如果用户滚动回底部，隐藏按钮
      if (currentlyNearBottom && showScrollToBottomButton) {
        // console.log(`[handleScroll] Hiding scroll to bottom button as user reached bottom.`);
        setShowScrollToBottomButton(false);
      }
    },

    [itemCount, getItemHeight, showScrollToBottomButton], // 依赖项，确保状态和函数引用最新
  );

  // 传递给 Row 组件的数据
  const itemData = useMemo(
    () => ({
      messages: allMessages,
      setSize,
      isRequesting,
    }),
    [allMessages, setSize, isRequesting],
  );

  // 首次渲染或对话切换后，确保滚动到底部
  useEffect(() => {
    // console.log('[useEffect initialScroll] Triggering initial scroll to bottom.');
    // 确保容器有高度后再滚动
    if (containerHeight > 0) {
      // 延迟确保 list 渲染完成
      const timer = setTimeout(() => scrollToBottom('auto'), 50);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, containerHeight]); // 依赖对话 ID 和容器高度

  return (
    <div className="relative flex h-full flex-col" ref={containerRef}>
      <HighlightTheme />

      {/* 主内容区域 */}
      <div className="relative flex-1 overflow-hidden">
        {' '}
        {/* 确保 flex-1 和 overflow-hidden */}
        {/* 空状态 */}
        {!isLoading && messages.length === 0 && !isGenerating ? (
          <EmptyState />
        ) : containerHeight > 0 ? ( // 确保容器有高度再渲染列表
          <VariableSizeList
            ref={listRef}
            outerRef={outerRef}
            height={containerHeight}
            width="100%"
            itemCount={itemCount}
            itemSize={getItemHeight} // 使用回调函数动态获取高度
            itemData={itemData}
            onScroll={handleScroll}
            overscanCount={5} // 增加预渲染数量，可能有助于平滑滚动
            // layout="vertical" // 默认是 vertical
          >
            {Row}
          </VariableSizeList>
        ) : (
          // 可以添加一个加载骨架屏或者简单的提示
          <div className="flex h-full items-center justify-center">
            <p className="text-muted-foreground">加载中...</p>
          </div>
        )}
      </div>

      {/* 滚动到底部按钮 */}
      {showScrollToBottomButton && (
        <Button
          type="button"
          variant="default"
          size="icon"
          // 使用平滑滚动
          onClick={() => scrollToBottom('smooth')}
          className="absolute bottom-4 left-1/2 z-10 h-10 w-10 -translate-x-1/2 transform rounded-full shadow-lg" // 添加阴影和 transform
          title="滚动到底部"
        >
          <ChevronsDown className="h-5 w-5" /> {/* 调整图标大小 */}
        </Button>
      )}
    </div>
  );
}
