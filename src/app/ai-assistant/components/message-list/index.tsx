'use client';

import React, {
  useRef,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import { ChevronsDown } from 'lucide-react';
import { VariableSizeList } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { useDebouncedCallback } from 'use-debounce';

import { Loading } from '@/components/ui/loading';
import { Button } from '@/components/ui/button';
import {
  AiRoleEnum,
  Conversation,
  Message,
  StreamingMessage,
} from '@/types/ai-assistant';

import {
  DEFAULT_ITEM_HEIGHT,
  OVERSCAN_COUNT,
  AUTO_SCROLL_DISABLE_THRESHOLD,
  BUTTON_SHOW_THRESHOLD,
} from '@/app/ai-assistant/consts';

import { HighlightTheme } from './HighlightTheme';
import { EmptyState } from './EmptyState';
import { Row } from './Row';
import { ItemData } from './types';

interface MessageListProps {
  streamingMessage: StreamingMessage;
  isLoading: boolean;
  activeConversationId?: string;
  activeConversation?: Conversation;
}

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
        listRef.current!.scrollToItem(allMessages.length - 1, 'end');
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
  }, [messages.length, handleScrollToBottom]);

  // 传递给 Row 组件的数据
  const itemData = useMemo<ItemData>(
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
