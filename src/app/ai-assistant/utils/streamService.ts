import { fetchEventSource } from '@microsoft/fetch-event-source';
import { generateUUID } from '@/lib/uuid';
import {
  Conversation,
  Message,
  StreamingState,
  ConversationStreamState,
} from '../types';

/**
 * 流式响应服务
 *
 * 该模块负责处理AI模型的流式响应，包括：
 * - 请求创建和中止
 * - 消息累积和状态更新
 * - 流完成后的回调
 */

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
  conversationId: string,
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
  conversationId: string,
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
  content: string,
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
  thinking: string,
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
  updateFn: (content: string) => void,
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
        : conv,
    ),
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
    role: 'assistant',
    content: content + '\n\n[回答已被中断]',
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
  modelId,
  abortControllerRef,
  setStreamingState,
  conversationId,
  setConversations,
  onComplete,
}: {
  messages: Message[];
  modelId: string;
  abortControllerRef: React.MutableRefObject<
    Record<string, AbortController | null>
  >;
  setStreamingState: React.Dispatch<React.SetStateAction<StreamingState>>;
  conversationId: string;
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  onComplete?: (conversationId: string) => void;
}): Promise<void> {
  // 1. 创建新的AbortController实例
  const abortController = new AbortController();

  // 2. 清理现有请求
  try {
    if (
      abortControllerRef.current[conversationId] &&
      typeof abortControllerRef.current[conversationId]?.abort === 'function'
    ) {
      console.log('清理现有请求:', conversationId);
      abortControllerRef.current[conversationId]?.abort();
    }
  } catch (e) {
    console.error('中止现有请求失败:', e);
  }

  // 3. 保存新控制器
  abortControllerRef.current[conversationId] = abortController;

  // 4. 执行流式请求
  return executeStreamRequest({
    messages,
    modelId,
    abortController,
    setStreamingState,
    conversationId,
    setConversations,
    onComplete,
  });
}

/**
 * 执行流式请求的核心逻辑
 */
async function executeStreamRequest({
  messages,
  modelId,
  abortController,
  setStreamingState,
  conversationId,
  setConversations,
  onComplete,
}: {
  messages: Message[];
  modelId: string;
  abortController: AbortController;
  setStreamingState: React.Dispatch<React.SetStateAction<StreamingState>>;
  conversationId: string;
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  onComplete?: (conversationId: string) => void;
}): Promise<void> {
  // 初始化流式状态
  initializeStreamingState(setStreamingState, conversationId);

  // 用于累积内容的引用对象
  const accumulatedContent = { value: '' };
  const accumulatedThinking = { value: '' };

  // 标记请求是否被中止
  const isAborted = { value: false };

  // 监听中止事件
  abortController.signal.addEventListener('abort', () => {
    isAborted.value = true;
    console.log('流式请求被中止:', conversationId);
  });

  try {
    console.log('启动流式响应:', conversationId);

    await fetchEventSource('/api/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        model: modelId,
      }),
      signal: abortController.signal,
      onmessage: (event) => {
        // 如果请求已被中止，不再处理消息
        if (isAborted.value) {
          console.log('请求已中止，忽略后续消息:', conversationId);
          return;
        }

        // 处理完成事件
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

        // 处理消息事件
        try {
          const data = JSON.parse(event.data);
          const { type, message } = data;

          if (type === 'text') {
            processAccumulatedContent(accumulatedContent, message, (content) =>
              updateStreamingContent(
                setStreamingState,
                conversationId,
                content,
              ),
            );
          } else if (type === 'think') {
            processAccumulatedContent(
              accumulatedThinking,
              message,
              (thinking) =>
                updateStreamingThinking(
                  setStreamingState,
                  conversationId,
                  thinking,
                ),
            );
          }
        } catch (parseError) {
          console.error('解析事件数据出错:', parseError);
        }
      },
      onerror: (error: Error) => {
        // 如果请求已被中止，不处理错误
        if (isAborted.value) {
          console.log('请求已中止，忽略错误:', conversationId);
          throw error; // 仍然抛出错误以终止fetchEventSource
        }

        handleStreamError({
          error,
          setStreamingState,
          setConversations,
          conversationId,
          onComplete,
        });
        throw error; // 抛出错误以终止fetchEventSource
      },
    });
  } catch (error: unknown) {
    // 处理中止错误
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('请求中止错误已处理:', conversationId);
    } else {
      console.error('流式响应异常:', error);
    }
  }
}

/**
 * 中止流式响应
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
  console.log('开始中止流式响应:', conversationId);

  // 立即更新UI状态
  updateStreamState({
    setStreamingState,
    conversationId,
    updates: { isLoading: false },
  });

  // 中止请求
  try {
    if (
      abortControllerRef.current[conversationId] &&
      typeof abortControllerRef.current[conversationId]?.abort === 'function'
    ) {
      console.log('中止控制器存在，开始中止:', conversationId);
      abortControllerRef.current[conversationId]?.abort();
      abortControllerRef.current[conversationId] = null;
    } else {
      console.log('中止控制器不存在或无效，跳过中止:', conversationId);
    }
  } catch (e) {
    console.error('中止请求失败:', e);
    // 即使中止失败，也清理引用
    abortControllerRef.current[conversationId] = null;
  }

  // 保存已累积的内容
  const currentStreamState = streamingState[conversationId];
  if (currentStreamState?.content) {
    addInterruptedMessageToConversation({
      setConversations,
      conversationId,
      content: currentStreamState.content,
      thinking: currentStreamState.thinking,
    });

    // 重置流式状态
    resetStreamingState(setStreamingState, conversationId);
  }
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
  console.log('流处理完成:', conversationId);

  // 添加累积的消息
  if (accumulatedContent.value || accumulatedThinking.value) {
    const newMessage: Message = {
      id: generateUUID(),
      role: 'assistant',
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

  // 调用完成回调
  if (onComplete) {
    console.log('调用流完成回调:', conversationId);
    onComplete(conversationId);
  }
}

/**
 * 处理流错误事件
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
  console.error('流处理错误:', error, conversationId);

  // 添加错误消息
  const errorMessage: Message = {
    id: generateUUID(),
    role: 'assistant',
    content: '抱歉，我暂时无法回答您的问题。请稍后再试或尝试其他问题。',
  };

  addMessageToConversation({
    setConversations,
    conversationId,
    message: errorMessage,
  });

  // 重置状态
  resetStreamingState(setStreamingState, conversationId);

  // 调用完成回调
  if (onComplete) {
    console.log('因错误调用流完成回调:', conversationId);
    onComplete(conversationId);
  }
}
