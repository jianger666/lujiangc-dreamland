import { fetchEventSource } from '@microsoft/fetch-event-source';
import { generateUUID } from '@/lib';

import {
  Conversation,
  Message,
  StreamingState,
  ConversationStreamState,
  AiRoleEnum,
} from '@/types/ai-assistant';

/**
 * 流式响应服务
 *
 * 该模块负责处理AI模型的流式响应，包括：
 * - 请求创建和中止
 * - 消息累积和状态更新
 * - 流完成后的回调
 */

// 统一的中断标记后缀
export const INTERRUPTED_SUFFIX = '[回答已被中断]';

// ===== 状态更新相关函数 =====

/**
 * 更新流式状态
 */
function updateStreamState({
  setStreamingState,
  conversationId,
  updates,
}: {
  setStreamingState: React.Dispatch<React.SetStateAction<StreamingState>>;
  conversationId: string;
  updates: Partial<ConversationStreamState>;
}) {
  setStreamingState((prev) => ({
    ...prev,
    [conversationId]: {
      ...prev[conversationId],
      ...updates,
    },
  }));
}

/**
 * 初始化流式状态
 */
export function initializeStreamingState(
  setStreamingState: React.Dispatch<React.SetStateAction<StreamingState>>,
  conversationId: string
): void {
  updateStreamState({
    setStreamingState,
    conversationId,
    updates: {
      content: '',
      thinking: '',
      isLoading: true,
    },
  });
}

/**
 * 重置流式状态
 */
export function resetStreamingState(
  setStreamingState: React.Dispatch<React.SetStateAction<StreamingState>>,
  conversationId: string
): void {
  updateStreamState({
    setStreamingState,
    conversationId,
    updates: {
      content: '',
      thinking: '',
      isLoading: false,
    },
  });
}

/**
 * 更新流式文本内容
 */
function updateStreamingContent(
  setStreamingState: React.Dispatch<React.SetStateAction<StreamingState>>,
  conversationId: string,
  content: string
): void {
  updateStreamState({
    setStreamingState,
    conversationId,
    updates: { content },
  });
}

/**
 * 更新流式思考内容
 */
function updateStreamingThinking(
  setStreamingState: React.Dispatch<React.SetStateAction<StreamingState>>,
  conversationId: string,
  thinking: string
): void {
  updateStreamState({
    setStreamingState,
    conversationId,
    updates: { thinking },
  });
}

// ===== 消息处理相关函数 =====

/**
 * 处理累积内容，处理转义换行符并更新状态
 */
function processAccumulatedContent(
  accumulator: { value: string },
  message: string,
  updateFn: (content: string) => void
): void {
  accumulator.value += message;
  accumulator.value = accumulator.value.replace(/\\n/g, '\n');
  updateFn(accumulator.value);
}

/**
 * 添加消息到对话
 */
function addMessageToConversation({
  setConversations,
  conversationId,
  message,
}: {
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  conversationId: string;
  message: Message;
}) {
  setConversations((currentConversations) =>
    currentConversations.map((conv) =>
      conv.id === conversationId
        ? {
            ...conv,
            messages: [...conv.messages, message],
            updatedAt: new Date().toISOString(),
          }
        : conv
    )
  );
}

/**
 * 添加中断消息到对话
 */
export function addInterruptedMessageToConversation({
  setConversations,
  conversationId,
  content,
  thinking,
}: {
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  conversationId: string;
  content: string;
  thinking?: string;
}) {
  const newMessage: Message = {
    id: generateUUID(),
    role: AiRoleEnum.Assistant,
    content: (content || '') + '\n\n' + INTERRUPTED_SUFFIX, // 保证即使 content 为空也能正确添加后缀
    ...(thinking ? { thinking } : {}),
  };

  addMessageToConversation({
    setConversations,
    conversationId,
    message: newMessage,
  });
}

// ===== 流式响应处理 =====

/**
 * 创建流式响应实例
 */
export async function startStreamResponse({
  messages,
  selectedModel,
  isWebSearchEnabled,
  abortControllerRef,
  setStreamingState,
  conversationId,
  setConversations,
  onComplete,
  imageDatas,
}: {
  messages: Message[];
  selectedModel: string;
  isWebSearchEnabled: boolean;
  abortControllerRef: React.MutableRefObject<
    Record<string, AbortController | null>
  >;
  setStreamingState: React.Dispatch<React.SetStateAction<StreamingState>>;
  conversationId: string;
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  onComplete?: (conversationId: string) => void;
  imageDatas?: string[];
}): Promise<void> {
  // 1. 创建新的AbortController实例
  const abortController = new AbortController();
  abortControllerRef.current[conversationId] = abortController;

  // 2. 初始化流式状态
  initializeStreamingState(setStreamingState, conversationId);

  // 3. 执行流式请求
  try {
    await executeStreamRequest({
      messages,
      selectedModel,
      isWebSearchEnabled,
      abortController,
      setStreamingState,
      conversationId,
      setConversations,
      onComplete,
      imageDatas,
    });
  } catch (error) {
    console.error('Stream response error:', error);
    resetStreamingState(setStreamingState, conversationId);
  } finally {
    // 清理AbortController引用
    abortControllerRef.current[conversationId] = null;
  }
}

/**
 * 执行流式请求
 */
async function executeStreamRequest({
  messages,
  selectedModel,
  isWebSearchEnabled,
  abortController,
  setStreamingState,
  conversationId,
  setConversations,
  onComplete,
  imageDatas,
}: {
  messages: Message[];
  selectedModel: string;
  isWebSearchEnabled: boolean;
  abortController: AbortController;
  setStreamingState: React.Dispatch<React.SetStateAction<StreamingState>>;
  conversationId: string;
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  onComplete?: (conversationId: string) => void;
  imageDatas?: string[];
}): Promise<void> {
  // 去除历史消息中的图片数据，减小请求大小
  const messagesWithoutImages = messages.map((msg, index) => {
    // 仅保留最后一条消息的图片（如果有）
    if (index < messages.length - 1) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { images, ...msgWithoutImage } = msg;
      return msgWithoutImage;
    }
    return msg;
  });

  // 检查是否是ImageReader模型或者当前选择的模型支持图片
  const isImageReaderModel =
    selectedModel === 'ImageReader' ||
    (imageDatas &&
      imageDatas.length > 0 &&
      selectedModel.includes('ImageReader'));

  // 如果上传了图片但当前模型不支持，则改用ImageReader处理
  const modelToUse =
    imageDatas && imageDatas.length > 0 && !isImageReaderModel
      ? 'ImageReader'
      : selectedModel;

  // 累积的内容
  const accumulatedContent = { value: '' };
  const accumulatedThinking = { value: '' };

  // 标记请求是否被中止
  const isAborted = { value: false };

  // 监听中止事件
  abortController.signal.addEventListener('abort', () => {
    isAborted.value = true;
    console.log('流式请求被中止:', conversationId);
  });

  // 2. 执行流式请求
  try {
    await fetchEventSource('/api/ai-assistant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: messagesWithoutImages,
        selectedModel: modelToUse,
        isWebSearchEnabled,
        imageDatas,
      }),
      signal: abortController.signal,
      openWhenHidden: true,

      onerror: (error) => {
        console.log('onerror triggered:', error);
        if (isAborted.value) {
          console.log('请求已中止，忽略错误:', conversationId);
          throw error;
        }

        try {
          handleStreamError({
            error,
            setStreamingState,
            setConversations,
            conversationId,
            onComplete,
          });
        } catch (fatalError) {
          console.log('Caught FatalStreamError, rethrowing to stop retries.');
          throw fatalError;
        }
      },

      onmessage: (event) => {
        if (isAborted.value) {
          console.log('请求已中止，忽略后续消息:', conversationId);
          return;
        }

        // 处理完成消息
        if (event.data === '[DONE]') {
          handleStreamComplete({
            accumulatedContent,
            accumulatedThinking,
            setStreamingState,
            setConversations,
            conversationId,
            onComplete,
          });
          return;
        }

        // 处理普通消息
        try {
          const data = JSON.parse(event.data);
          const { type, message } = data;

          if (type === 'text') {
            processAccumulatedContent(accumulatedContent, message, (content) =>
              updateStreamingContent(setStreamingState, conversationId, content)
            );
          } else if (type === 'think') {
            processAccumulatedContent(
              accumulatedThinking,
              message,
              (thinking) =>
                updateStreamingThinking(
                  setStreamingState,
                  conversationId,
                  thinking
                )
            );
          }
        } catch (parseError) {
          console.error('解析事件数据出错:', parseError);
        }
      },
    });
  } catch (error) {
    if (
      !isAborted.value &&
      !(error instanceof Error && error.message === 'FatalStreamError')
    ) {
      console.error('Unhandled error during stream execution:', error);
    } else if (error instanceof Error && error.message === 'FatalStreamError') {
      console.log(
        'FatalStreamError caught outside fetchEventSource, stopping.'
      );
    } else {
      console.log('Stream aborted or error already handled.');
    }
  }
}

/**
 * 停止流式响应
 */
export function stopStreamResponse({
  abortControllerRef,
  conversationId,
  setStreamingState,
  setConversations,
  streamingState,
}: {
  abortControllerRef: React.MutableRefObject<
    Record<string, AbortController | null>
  >;
  conversationId: string;
  setStreamingState: React.Dispatch<React.SetStateAction<StreamingState>>;
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  streamingState: StreamingState;
}): void {
  // 1. 获取并调用AbortController
  const controller = abortControllerRef.current[conversationId];
  if (controller) {
    controller.abort();
    abortControllerRef.current[conversationId] = null; // 清理引用
  }

  // 2. 获取当前流状态
  const currentStream = streamingState[conversationId];

  // 3. 处理中断消息 - 统一调用 addInterruptedMessageToConversation
  if (currentStream && currentStream.isLoading) {
    // 只有在确实处于加载状态时才添加中断消息
    addInterruptedMessageToConversation({
      setConversations,
      conversationId,
      content: currentStream.content || '', // 传递当前内容，如果为空则传递空字符串
      thinking: currentStream.thinking,
    });
  }

  // 4. 无论如何都重置流状态以确保清理
  resetStreamingState(setStreamingState, conversationId);
}

// ===== 辅助函数 =====

/**
 * 处理流完成事件
 */
function handleStreamComplete({
  accumulatedContent,
  accumulatedThinking,
  setStreamingState,
  setConversations,
  conversationId,
  onComplete,
}: {
  accumulatedContent: { value: string };
  accumulatedThinking: { value: string };
  setStreamingState: React.Dispatch<React.SetStateAction<StreamingState>>;
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  conversationId: string;
  onComplete?: (conversationId: string) => void;
}): void {
  // 只有存在内容时才添加消息
  if (accumulatedContent.value || accumulatedThinking.value) {
    const newMessage: Message = {
      id: generateUUID(),
      role: AiRoleEnum.Assistant,
      content: accumulatedContent.value,
      ...(accumulatedThinking.value
        ? { thinking: accumulatedThinking.value }
        : {}),
    };

    addMessageToConversation({
      setConversations,
      conversationId,
      message: newMessage,
    });
  }

  // 重置状态
  resetStreamingState(setStreamingState, conversationId);

  // 如果当前对话启用了联网搜索，在回答完成后自动关闭它
  setConversations((currentConversations) =>
    currentConversations.map((conv) =>
      conv.id === conversationId && conv.isWebSearchEnabled
        ? {
            ...conv,
            isWebSearchEnabled: false, // 自动关闭联网搜索
            updatedAt: new Date().toISOString(),
          }
        : conv
    )
  );

  // 调用完成回调
  if (onComplete) {
    onComplete(conversationId);
  }
}

/**
 * 处理流错误事件 - 提供友好的错误消息
 */
function handleStreamError({
  error,
  setStreamingState,
  setConversations,
  conversationId,
  onComplete,
}: {
  error: Error;
  setStreamingState: React.Dispatch<React.SetStateAction<StreamingState>>;
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  conversationId: string;
  onComplete?: (conversationId: string) => void;
}): void {
  // 直接使用原始错误消息
  const errorContent: Message = {
    id: generateUUID(),
    role: AiRoleEnum.Assistant,
    content: error.message,
  };

  // 添加到对话
  addMessageToConversation({
    setConversations,
    conversationId,
    message: errorContent,
  });

  // 重置状态
  resetStreamingState(setStreamingState, conversationId);

  // 调用完成回调
  if (onComplete) {
    console.log('因错误调用流完成回调:', conversationId);
    onComplete(conversationId);
  }

  throw new Error('FatalStreamError');
}

/**
 * 同步生成包含中断标记的新对话数组 (用于 beforeunload)
 * 注意：此函数不修改原始数组，也不执行 React 状态更新
 */
export function generateInterruptedConversations(
  conversations: Conversation[],
  streamingState: StreamingState
): Conversation[] {
  // 使用 map 创建新数组，避免直接修改状态
  return conversations.map((conv) => {
    const currentStream = streamingState[conv.id];
    if (currentStream && currentStream.isLoading) {
      // 如果该对话正在加载中，添加中断消息
      const currentStreamContent = currentStream.content || '';
      const currentStreamThinking = currentStream.thinking || '';

      const newMessage: Message = {
        id: generateUUID(),
        role: AiRoleEnum.Assistant,
        content: currentStreamContent + INTERRUPTED_SUFFIX,
        ...(currentStreamThinking ? { thinking: currentStreamThinking } : {}),
      };

      // 返回修改后的对话副本
      return {
        ...conv,
        messages: [...conv.messages, newMessage],
        updatedAt: new Date().toISOString(),
      };
    }
    // 如果没有在加载，返回原始对话
    return conv;
  });
}
