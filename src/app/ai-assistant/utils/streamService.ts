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
    role: AiRoleEnum.Assistant,
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
  abortControllerRef.current[conversationId] = abortController;

  // 2. 初始化流式状态
  initializeStreamingState(setStreamingState, conversationId);

  // 3. 执行流式请求
  try {
    await executeStreamRequest({
      messages,
      modelId,
      abortController,
      setStreamingState,
      conversationId,
      setConversations,
      onComplete,
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
  // 1. 初始化累积内容
  const accumulatedContent = { value: '' };
  const accumulatedThinking = { value: '' };

  // 标记请求是否被中止
  const isAborted = { value: false };

  // 监听中止事件
  abortController.signal.addEventListener('abort', () => {
    isAborted.value = true;
    console.log('流式请求被中止:', conversationId);
  });

  // 2. 创建流式请求
  try {
    const makeStreamRequest = async (): Promise<void> => {
      // 执行SSE请求
      await fetchEventSource('/api/ai-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          model: modelId,
        }),
        signal: abortController.signal,
        openWhenHidden: true,
        onopen: async (response) => {
          console.log(`[连接已打开] 状态: ${response.status}`, conversationId);
          if (response.ok) {
            return;
          }
          // 处理HTTP错误
          if (response.status >= 400 && response.status < 500) {
            console.error(`[客户端错误] ${response.status}:`, conversationId);
            throw new Error(
              `错误 ${response.status}: ${await response.text()}`,
            );
          }
          console.error(`[服务器错误] ${response.status}:`, conversationId);
          throw new Error(`服务器错误 ${response.status}`);
        },
        onmessage: (event) => {
          if (isAborted.value) {
            console.log('请求已中止，忽略后续消息:', conversationId);
            return;
          }

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

          try {
            const data = JSON.parse(event.data);
            const { type, message } = data;

            if (type === 'text') {
              processAccumulatedContent(
                accumulatedContent,
                message,
                (content) =>
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
        onerror: (error) => {
          if (isAborted.value) {
            console.log('请求已中止，忽略错误:', conversationId);
            throw error;
          }

          console.error('[SSE错误]', error.message, conversationId);

          // 自定义重试逻辑
          const shouldRetry =
            !isAborted.value &&
            (error.message.includes('network') ||
              error.message.includes('Failed to fetch') ||
              error.message.includes('timeout'));

          if (shouldRetry) {
            // 不抛出错误，让fetchEventSource继续尝试
            return;
          }

          // 不应重试的错误，处理为终止状态
          handleStreamError({
            error,
            setStreamingState,
            setConversations,
            conversationId,
            onComplete,
          });
          throw error;
        },
      });
    };

    // 执行请求
    await makeStreamRequest();
  } catch (error) {
    // 只有未中止的请求才视为错误
    if (!isAborted.value) {
      handleStreamError({
        error: error as Error,
        setStreamingState,
        setConversations,
        conversationId,
        onComplete,
      });
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

  updateStreamState({
    setStreamingState,
    conversationId,
    updates: { isLoading: false },
  });

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
    abortControllerRef.current[conversationId] = null;
  }

  const currentStreamState = streamingState[conversationId];
  if (currentStreamState?.content) {
    addInterruptedMessageToConversation({
      setConversations,
      conversationId,
      content: currentStreamState.content,
      thinking: currentStreamState.thinking,
    });

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

  resetStreamingState(setStreamingState, conversationId);

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

  // 获取更友好的错误消息
  let errorMessage = '抱歉，我暂时无法回答您的问题。请稍后再试或尝试其他问题。';

  // 根据错误类型提供具体错误信息
  if (
    error.message.includes('Failed to fetch') ||
    error.message.includes('network')
  ) {
    errorMessage = '网络连接中断。请检查您的网络连接后重试。';
  } else if (error.message.includes('timeout')) {
    errorMessage = '连接超时。服务器响应时间过长，请稍后再试。';
  } else if (error.message.includes('500')) {
    errorMessage = '服务器内部错误。我们的服务器遇到了问题，技术团队正在处理。';
  } else if (error.message.includes('429')) {
    errorMessage = '请求过于频繁。请稍等片刻再发送新的消息。';
  }

  // 添加错误消息到对话
  const errorContent: Message = {
    id: generateUUID(),
    role: AiRoleEnum.Assistant,
    content: errorMessage,
  };

  // 添加调试信息（仅在非生产环境）
  if (process.env.NODE_ENV !== 'production') {
    errorContent.content += `\n\n[调试信息: ${error.message}]`;
  }

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
}
