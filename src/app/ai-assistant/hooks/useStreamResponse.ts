import { useCallback, useRef, useState } from "react";
import { Conversation, Message, StreamingState } from "@/types/ai-assistant";
import {
  resetStreamingState as resetStreamingStateUtil,
  startStreamResponse as startStreamResponseUtil,
  stopStreamResponse as stopStreamResponseUtil,
} from "../utils/streamService";

export const useStreamResponse = () => {
  // 各对话的流式响应状态
  const [streamingState, setStreamingState] = useState<StreamingState>({});

  // 存储每个对话的AbortController实例
  const abortControllersRef = useRef<Record<string, AbortController | null>>(
    {},
  );

  // 处理流式响应完成后的回调
  const handleStreamingComplete = useCallback((conversationId: string) => {
    // 由父组件实现具体逻辑
    return conversationId;
  }, []);

  // 启动流式响应
  const startStreamResponse = useCallback(
    async ({
      messages,
      selectedModel,
      conversationId,
      setConversations,
      onComplete,
      isWebSearchEnabled,
      imageDatas,
    }: {
      messages: Message[];
      selectedModel: string;
      conversationId: string;
      setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
      onComplete: (conversationId: string) => void;
      isWebSearchEnabled: boolean;
      imageDatas?: string[];
    }) => {
      return startStreamResponseUtil({
        messages,
        selectedModel,
        isWebSearchEnabled,
        abortControllerRef: abortControllersRef,
        setStreamingState,
        conversationId,
        setConversations,
        onComplete,
        imageDatas,
      });
    },
    [],
  );

  // 停止流式响应
  const stopStreamResponse = useCallback(
    ({
      conversationId,
      setConversations,
    }: {
      conversationId: string;
      setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
    }) => {
      if (!conversationId) return;

      stopStreamResponseUtil({
        abortControllerRef: abortControllersRef,
        conversationId,
        setStreamingState,
        setConversations,
        streamingState,
      });
    },
    [streamingState],
  );

  // 重置流式响应状态
  const resetStreamingState = useCallback(
    (
      setStreamingStateFn: React.Dispatch<React.SetStateAction<StreamingState>>,
      conversationId: string,
    ) => {
      resetStreamingStateUtil(setStreamingStateFn, conversationId);
    },
    [],
  );

  return {
    streamingState,
    setStreamingState,
    abortControllersRef,
    handleStreamingComplete,
    startStreamResponse,
    stopStreamResponse,
    resetStreamingState,
  };
};
