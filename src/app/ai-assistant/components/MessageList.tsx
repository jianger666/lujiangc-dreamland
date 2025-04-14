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
import {
  AiRoleEnum,
  Conversation,
  Message,
  StreamingMessage,
} from '@/types/ai-assistant';
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
import { Loading } from '@/components/ui/loading';
import { Button } from '@/components/ui/button';
import AutoSizer from 'react-virtualized-auto-sizer';
import { useDebouncedCallback } from 'use-debounce';

const DEFAULT_ITEM_HEIGHT = 500;
const OVERSCAN_COUNT = 3;
const AUTO_SCROLL_DISABLE_THRESHOLD = 100; // 禁用自动滚动的阈值
const BUTTON_SHOW_THRESHOLD = 100; // 显示按钮的阈值

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
        'prose prose-sm max-w-none break-words',
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
  loadingMode,
}: {
  message?: Message | StreamingMessage;
  style: React.CSSProperties;
  setSize: (index: number, size: number) => void;
  index: number;
  loadingMode: boolean;
}) {
  const itemRef = useRef<HTMLDivElement>(null);
  const role = message?.role ?? AiRoleEnum.Assistant;
  const thinking = message?.thinking ?? undefined;

  // 动态更新项目高度
  useEffect(() => {
    if (itemRef.current) {
      if (itemRef.current.scrollHeight > 0) {
        setSize(index, itemRef.current.scrollHeight);
      }
    }
    // 依赖项：当消息内容或思考内容变化时重新计算
  }, [message?.content, thinking, setSize, index]);

  return (
    <div style={style}>
      {/* 将 padding 应用在内部 div 上，以便 itemRef 能正确测量 */}
      <div ref={itemRef} className="p-3">
        {loadingMode ? (
          <div className="flex justify-start px-3 py-2">
            <div className="rounded-lg bg-muted px-4 py-2">
              <Loading dot />
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {thinking && <ThinkingBlock content={thinking} />}
              {message?.content && (
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
                      <CopyButton
                        textToCopy={message.content}
                        title="复制消息"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
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
  streamingMessage: StreamingMessage;
  isLoading: boolean;
  activeConversationId?: string;
  activeConversation?: Conversation;
}

interface ItemData {
  messages: (Message | StreamingMessage | undefined)[];
  setSize: (index: number, size: number) => void;
  isRequesting: boolean;
  isGenerating: boolean;
}

// 虚拟列表渲染的列表项
const Row = React.memo(
  ({ data, index, style }: ListChildComponentProps<ItemData>) => {
    const { messages, setSize, isRequesting } = data;

    return (
      <MessageItem
        message={messages[index]}
        style={style}
        setSize={setSize}
        index={index}
        // 如果当前消息是最后一个消息，并且正在请求，则显示加载指示器
        loadingMode={isRequesting && index === messages.length - 1}
      />
    );
  },
);

Row.displayName = 'VirtualRow';

export function MessageList({
  streamingMessage,
  isLoading,
  activeConversation,
  activeConversationId,
}: MessageListProps) {
  const listRef = useRef<VariableSizeList>(null);
  const outerListRef = useRef<HTMLDivElement>(null);
  const itemHeightsRef = useRef<Record<number, number>>({});
  const [messages, setMessages] = useState<Message[]>([]);
  const [isFirstScrollToBottom, setIsFirstScrollToBottom] = useState(false);
  const isUserScrolledUpRef = useRef(false); // 使用 ref 立即跟踪滚动状态
  const [showScrollToBottomButton, setShowScrollToBottomButton] =
    useState(false); // 单独的 state 控制按钮显示

  const isGenerating = useMemo(
    () => !!streamingMessage.content || !!streamingMessage.thinking,
    [streamingMessage],
  );

  const isRequesting = useMemo(
    () => isLoading && !isGenerating,
    [isLoading, isGenerating],
  );

  const allMessages = useMemo(() => {
    const result: (Message | StreamingMessage | undefined)[] = [...messages];
    // 为undefined时，则是加载指示器
    if (isRequesting) result.push(undefined);
    else if (isGenerating) result.push(streamingMessage);
    return result;
  }, [messages, streamingMessage, isRequesting, isGenerating]);

  const handleScrollToBottom = useCallback(
    (smooth: boolean = false) => {
      if (listRef.current && outerListRef.current) {
        outerListRef.current.style.scrollBehavior = smooth ? 'smooth' : 'auto';
        listRef.current.scrollToItem(allMessages.length - 1, 'end');
        // 滚动到底部时，重置 ref 并隐藏按钮
        isUserScrolledUpRef.current = false;

        setShowScrollToBottomButton(false);
      }
    },
    [allMessages.length],
  );

  const debounceFirstScrollToBottom = useDebouncedCallback(() => {
    handleScrollToBottom(false);

    setTimeout(() => {
      setIsFirstScrollToBottom(() => true);
    }, 500);
  }, 100);

  // 修改: setSize 中的自动滚动逻辑，依赖 ref
  const setSize = useCallback(
    (index: number, size: number) => {
      if (itemHeightsRef.current[index] !== size) {
        itemHeightsRef.current[index] = size;
        listRef.current?.resetAfterIndex(index, false);
        // 页面初始化或者切换对话时，滚动到底部
        if (!isFirstScrollToBottom) {
          debounceFirstScrollToBottom();
        }
        // 正常生成消息时，如果 ref 表示用户没向上滚动，则滚动到底部
        else if (isLoading && !isUserScrolledUpRef.current) {
          handleScrollToBottom(false);
        }
      }
    },
    [
      debounceFirstScrollToBottom,
      handleScrollToBottom,
      isFirstScrollToBottom,
      isLoading,
    ],
  );

  // 获取项目高度的回调函数
  const getItemHeight = useCallback((index: number) => {
    return itemHeightsRef.current[index] ?? DEFAULT_ITEM_HEIGHT;
  }, []);

  // 修改: 滚动事件处理，区分滚动来源，更新 ref 和按钮 state
  const handleScroll = useCallback(
    ({
      scrollOffset,
      scrollUpdateWasRequested,
    }: {
      scrollOffset: number;
      scrollUpdateWasRequested: boolean;
    }) => {
      // 如果是程序化滚动触发的，则不处理 (例如 scrollToItem)
      if (scrollUpdateWasRequested) {
        return;
      }

      if (outerListRef.current) {
        const { scrollHeight, clientHeight } = outerListRef.current;
        const scrollTop = scrollOffset;

        // 计算是否接近底部 (用于禁用自动滚动)
        const isNearBottomForAutoScroll =
          scrollHeight - scrollTop - clientHeight <
          AUTO_SCROLL_DISABLE_THRESHOLD;

        // 计算是否接近底部 (用于显示按钮)
        const isNearBottomForButton =
          scrollHeight - scrollTop - clientHeight < BUTTON_SHOW_THRESHOLD;

        setShowScrollToBottomButton(!isNearBottomForButton);

        isUserScrolledUpRef.current = !isNearBottomForAutoScroll;
      }
    },
    [], // 添加依赖
  );

  // 初始化或者切换列表，重置各种状态
  useEffect(() => {
    // 切换对话时，重置是否滚动到底部和用户滚动状态
    setIsFirstScrollToBottom(false);
    isUserScrolledUpRef.current = false;
    setShowScrollToBottomButton(false);
    itemHeightsRef.current = {};
  }, [activeConversationId]);

  useEffect(() => {
    const currentMessages = activeConversation?.messages ?? [];
    setMessages(() => currentMessages);

    // 如果没有消息，认为已经在底部
    if (!activeConversation?.messages.length) {
      setIsFirstScrollToBottom(true);
      isUserScrolledUpRef.current = false;
      setShowScrollToBottomButton(false);
    }
  }, [
    activeConversation?.id,
    activeConversation?.messages,
    activeConversationId,
    isGenerating,
  ]);

  useEffect(() => {
    if (
      messages.length > 0 &&
      messages[messages.length - 1].role === AiRoleEnum.User
    ) {
      handleScrollToBottom(true);
    }
  }, [messages.length]);

  // 传递给 Row 组件的数据
  const itemData = useMemo(
    () => ({
      messages: allMessages,
      setSize,
      isRequesting,
      isGenerating,
    }),
    [allMessages, setSize, isRequesting, isGenerating],
  );

  return (
    <div className="relative flex h-full flex-col">
      <HighlightTheme />

      {/* 主内容区域 */}
      <div className="flex-1 overflow-hidden">
        <AutoSizer>
          {/* 空状态 */}
          {({ width, height }) => {
            return !isLoading && messages.length === 0 ? (
              <div style={{ height, width }}>
                <EmptyState />
              </div>
            ) : (
              <>
                <Loading
                  overlay
                  detectParent
                  className="bg-background"
                  text="加载中..."
                  dot
                  loading={!isFirstScrollToBottom}
                />

                <VariableSizeList
                  ref={listRef}
                  outerRef={outerListRef}
                  onScroll={handleScroll}
                  height={height}
                  width={width}
                  itemCount={allMessages.length}
                  itemSize={getItemHeight}
                  itemData={itemData}
                  overscanCount={OVERSCAN_COUNT}
                  estimatedItemSize={DEFAULT_ITEM_HEIGHT}
                  initialScrollOffset={allMessages.length * DEFAULT_ITEM_HEIGHT}
                  itemKey={(index, data) => data.messages[index]?.id ?? index}
                >
                  {Row}
                </VariableSizeList>
              </>
            );
          }}
        </AutoSizer>
      </div>

      {/* 滚动到底部按钮 */}
      {showScrollToBottomButton && (
        <Button
          type="button"
          variant="default"
          size="icon"
          // 使用平滑滚动
          onClick={() => handleScrollToBottom(true)}
          className="absolute bottom-4 left-1/2 z-10 h-10 w-10 -translate-x-1/2 transform rounded-full shadow-lg"
          title="滚动到底部"
        >
          <ChevronsDown />
        </Button>
      )}
    </div>
  );
}
