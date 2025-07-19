"use client";

import React, {
  useRef,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { ChevronsDown } from "lucide-react";
import { VariableSizeList } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import { useDebouncedCallback } from "use-debounce";

import { Loading } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { AiRoleEnum, Message, StreamingMessage } from "@/types/ai-assistant";
import { useAIAssistant } from "../../hooks";

import {
  DEFAULT_ITEM_HEIGHT,
  OVERSCAN_COUNT,
  AUTO_SCROLL_DISABLE_THRESHOLD,
  BUTTON_SHOW_THRESHOLD,
} from "@/app/ai-assistant/consts";

import { HighlightTheme } from "./HighlightTheme";
import { EmptyState } from "./EmptyState";
import { Row } from "./Row";
import { ItemData } from "./types";

export function MessageList() {
  const { currentStreamingState, activeConversation, activeConversationId } =
    useAIAssistant();

  const streamingMessage: StreamingMessage = useMemo(
    () => ({
      content: currentStreamingState.content,
      thinking: currentStreamingState.thinking,
    }),
    [currentStreamingState],
  );
  const isLoading = currentStreamingState.isLoading;

  const listRef = useRef<VariableSizeList>(null);
  const outerListRef = useRef<HTMLDivElement>(null);
  const itemHeightsRef = useRef<Record<number, number>>({});
  const [isFirstScrollToBottom, setIsFirstScrollToBottom] = useState(false);
  const isUserScrolledUpRef = useRef(false);
  const [showScrollToBottomButton, setShowScrollToBottomButton] =
    useState(false);

  const debouncedSetShowScrollToBottomButton = useDebouncedCallback(
    setShowScrollToBottomButton,
    50,
  );

  const isGenerating = useMemo(
    () => !!streamingMessage.content || !!streamingMessage.thinking,
    [streamingMessage],
  );

  const isRequesting = useMemo(
    () => isLoading && !isGenerating,
    [isLoading, isGenerating],
  );

  const allMessages = useMemo(() => {
    const result: (Message | StreamingMessage | undefined)[] = [
      ...(activeConversation?.messages ?? []),
    ];
    if (isRequesting) result.push(undefined);
    else if (isGenerating) result.push(streamingMessage);
    return result;
  }, [
    activeConversation?.messages,
    isRequesting,
    isGenerating,
    streamingMessage,
  ]);

  const handleScrollToBottom = useCallback(
    (smooth: boolean = false) => {
      if (listRef.current && outerListRef.current) {
        outerListRef.current.style.scrollBehavior = smooth ? "smooth" : "auto";
        listRef.current!.scrollToItem(allMessages.length - 1, "end");
        isUserScrolledUpRef.current = false;
        setShowScrollToBottomButton(false);
      }
    },
    [allMessages.length],
  );

  // 切换窗口时或者首次加载时，滚动到底部
  // 由于状态更新会导致触发多次，所以使用防抖
  const debounceFirstScrollToBottom = useDebouncedCallback(() => {
    handleScrollToBottom(false);

    // 加个定时器，确保虚拟列表加载以及滚动到底部的动作完成了
    setTimeout(() => {
      setIsFirstScrollToBottom(() => true);
    }, 300);
  }, 100);

  const setSize = useCallback(
    (index: number, size: number) => {
      if (itemHeightsRef.current[index] !== size) {
        itemHeightsRef.current[index] = size;
        listRef.current?.resetAfterIndex(index, false);
        if (!isFirstScrollToBottom) {
          debounceFirstScrollToBottom();
        } else if (isGenerating && !isUserScrolledUpRef.current) {
          console.log("生成滚动到底部");

          handleScrollToBottom(false);
        }
      }
    },
    [
      debounceFirstScrollToBottom,
      isFirstScrollToBottom,
      isGenerating,
      handleScrollToBottom,
    ],
  );

  const getItemHeight = useCallback((index: number) => {
    return itemHeightsRef.current[index] ?? DEFAULT_ITEM_HEIGHT;
  }, []);

  const handleScroll = useCallback(
    ({
      scrollOffset,
      scrollUpdateWasRequested,
    }: {
      scrollOffset: number;
      scrollUpdateWasRequested: boolean;
    }) => {
      if (scrollUpdateWasRequested) {
        return;
      }

      if (outerListRef.current) {
        const { scrollHeight, clientHeight } = outerListRef.current;
        const scrollTop = scrollOffset;

        const isNearBottomForAutoScroll =
          scrollHeight - scrollTop - clientHeight <
          AUTO_SCROLL_DISABLE_THRESHOLD;

        const isNearBottomForButton =
          scrollHeight - scrollTop - clientHeight < BUTTON_SHOW_THRESHOLD;

        debouncedSetShowScrollToBottomButton(!isNearBottomForButton);

        isUserScrolledUpRef.current = !isNearBottomForAutoScroll;
      }
    },
    [debouncedSetShowScrollToBottomButton],
  );

  // 当切换窗口时，重置状态
  useEffect(() => {
    setIsFirstScrollToBottom(false);
    isUserScrolledUpRef.current = false;
    setShowScrollToBottomButton(false);
    itemHeightsRef.current = {};
  }, [activeConversationId]);

  useEffect(() => {
    const { messages = [] } = activeConversation ?? {};

    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      // 如果最后一条消息是用户的，则无条件滚动到底部（平滑），用于用户不在底部，但是发了消息后，我会自动滚动到底部
      if (lastMessage.role === AiRoleEnum.User && !isGenerating) {
        handleScrollToBottom(true);
      }
      // 如果最后一条消息是助手的，并且用户没有向上滚动，则滚动到底部（立即）,用于切换窗口直接展示底部
      else if (!isUserScrolledUpRef.current && !isGenerating) {
        handleScrollToBottom(false);
      }
    }

    // 处理空消息列表的情况
    if (messages.length === 0) {
      setIsFirstScrollToBottom(true);
      isUserScrolledUpRef.current = false;
      setShowScrollToBottomButton(false);
    }
  }, [activeConversation, handleScrollToBottom, isGenerating]);

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

      <div className="flex-1 overflow-hidden">
        <AutoSizer>
          {({ width, height }) => {
            return !isLoading && activeConversation?.messages?.length === 0 ? (
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

      {showScrollToBottomButton && (
        <Button
          type="button"
          variant="default"
          size="icon"
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
