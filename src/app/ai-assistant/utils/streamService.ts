import { fetchEventSource } from '@microsoft/fetch-event-source';
import { generateUUID } from '@/lib/uuid';
import {
  Conversation,
  Message,
  StreamingState,
  ConversationStreamState,
} from '../types';
import {
  LongRunningTask,
  createTask,
  updateTaskContent,
  updateTaskThinking,
  completeTask,
  markTaskError,
  getTask,
} from './taskStore';

/**
 * 流式响应服务
 *
 * 该模块负责处理AI模型的流式响应，包括：
 * - 请求创建和中止
 * - 消息累积和状态更新
 * - 流完成后的回调
 * - 长时间运行任务的恢复和重连
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
 * 创建或恢复长时间运行任务
 */
function createOrResumeTask(
  conversationId: string,
  modelId: string,
  messages: Message[],
): LongRunningTask {
  // 检查是否有未完成的相同对话任务
  const pendingTask = window.localStorage.getItem(
    `pending_task_${conversationId}`,
  );

  if (pendingTask) {
    const taskId = pendingTask;
    const task = getTask(taskId);

    if (task && !task.isComplete && !task.isError) {
      console.log('恢复未完成任务:', taskId);
      return task;
    }
  }

  // 创建新任务
  const task = createTask(conversationId, modelId, messages);
  window.localStorage.setItem(`pending_task_${conversationId}`, task.id);
  return task;
}

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

  // 创建或恢复任务
  const task = createOrResumeTask(conversationId, modelId, messages);

  // 如果任务有内容，立即更新UI状态
  if (task.content || task.thinking) {
    console.log('从存储恢复状态:', {
      content: task.content.length,
      thinking: task.thinking.length,
    });

    initializeStreamingState(setStreamingState, conversationId);

    if (task.content) {
      updateStreamingContent(setStreamingState, conversationId, task.content);
    }

    if (task.thinking) {
      updateStreamingThinking(setStreamingState, conversationId, task.thinking);
    }
  }

  // 2. 执行流式请求
  try {
    await executeStreamRequest({
      messages,
      modelId,
      abortController,
      setStreamingState,
      conversationId,
      setConversations,
      onComplete,
      taskId: task.id,
    });
  } catch (error) {
    console.error('流式响应发生错误:', error);

    // 如果任务有内容，则将其添加为中断的消息
    if (task.content) {
      addInterruptedMessageToConversation({
        setConversations,
        conversationId,
        content: task.content,
        thinking: task.thinking,
      });
    }

    // 重置状态
    resetStreamingState(setStreamingState, conversationId);

    // 标记任务出错
    if (error instanceof Error) {
      markTaskError(task.id, error.message);
    } else {
      markTaskError(task.id, '未知错误');
    }

    // 清除挂起任务引用
    window.localStorage.removeItem(`pending_task_${conversationId}`);
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
  taskId,
}: {
  messages: Message[];
  modelId: string;
  abortController: AbortController;
  setStreamingState: React.Dispatch<React.SetStateAction<StreamingState>>;
  conversationId: string;
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  onComplete?: (conversationId: string) => void;
  taskId: string;
}): Promise<void> {
  // 初始化流式状态
  initializeStreamingState(setStreamingState, conversationId);

  // 用于累积内容的引用对象
  const accumulatedContent = { value: '' };
  const accumulatedThinking = { value: '' };

  // 从任务中恢复内容（如果有）
  const task = getTask(taskId);
  if (task) {
    accumulatedContent.value = task.content || '';
    accumulatedThinking.value = task.thinking || '';

    if (accumulatedContent.value) {
      updateStreamingContent(
        setStreamingState,
        conversationId,
        accumulatedContent.value,
      );
    }

    if (accumulatedThinking.value) {
      updateStreamingThinking(
        setStreamingState,
        conversationId,
        accumulatedThinking.value,
      );
    }
  }

  // 标记请求是否被中止
  const isAborted = { value: false };
  // 跟踪连接尝试次数
  let connectionAttempts = 0;
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000;

  // 监听中止事件
  abortController.signal.addEventListener('abort', () => {
    isAborted.value = true;
    console.log('流式请求被中止:', conversationId);
  });

  try {
    console.log('启动流式响应:', conversationId);

    // 自定义重试逻辑
    const makeStreamRequest = async (): Promise<void> => {
      try {
        await fetchEventSource('/api/ai', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
            'X-Client-ID': conversationId,
          },
          body: JSON.stringify({
            messages,
            model: modelId,
            clientId: taskId, // 传递任务ID给服务器
          }),
          openWhenHidden: true,
          signal: abortController.signal,
          onopen: async (response) => {
            console.log(
              `[连接已打开] 状态: ${response.status}`,
              conversationId,
            );
            if (response.ok) {
              // 重置尝试次数
              connectionAttempts = 0;
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
                taskId,
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
                  (content) => {
                    updateStreamingContent(
                      setStreamingState,
                      conversationId,
                      content,
                    );
                    // 更新任务内容
                    updateTaskContent(taskId, content);
                  },
                );
              } else if (type === 'think') {
                processAccumulatedContent(
                  accumulatedThinking,
                  message,
                  (thinking) => {
                    updateStreamingThinking(
                      setStreamingState,
                      conversationId,
                      thinking,
                    );
                    // 更新任务思考内容
                    updateTaskThinking(taskId, thinking);
                  },
                );
              } else if (type === 'task') {
                // 处理任务状态更新
                console.log('任务状态更新:', data);
              }
            } catch (parseError) {
              console.error('解析事件数据出错:', parseError);
            }
          },
          onerror: (error: Error) => {
            if (isAborted.value) {
              console.log('请求已中止，忽略错误:', conversationId);
              throw error;
            }

            console.error('[SSE错误]', error.message, conversationId);

            // 自定义重试逻辑
            const shouldRetry =
              connectionAttempts < MAX_RETRIES &&
              !isAborted.value &&
              (error.message.includes('network') ||
                error.message.includes('Failed to fetch') ||
                error.message.includes('timeout'));

            if (shouldRetry) {
              connectionAttempts++;
              console.log(
                `[重试] 第${connectionAttempts}次尝试...`,
                conversationId,
              );
              // 不抛出错误，让fetchEventSource继续
              // 而是在下面的setTimeout中重新调用makeStreamRequest
              return;
            }

            // 超过重试次数或不应重试的错误，查看是否可以从本地存储恢复
            if (accumulatedContent.value) {
              // 如果有内容，标记为部分完成
              handleStreamComplete({
                accumulatedContent,
                accumulatedThinking,
                setStreamingState,
                setConversations,
                conversationId,
                onComplete,
                taskId,
                isPartial: true,
              });
              return;
            }

            // 没有内容可恢复，处理为终止状态
            handleStreamError({
              error,
              setStreamingState,
              setConversations,
              conversationId,
              onComplete,
              taskId,
            });
            throw error;
          },
        });
      } catch (fetchError) {
        if (
          !isAborted.value &&
          connectionAttempts < MAX_RETRIES &&
          fetchError instanceof Error &&
          !(fetchError.name === 'AbortError')
        ) {
          connectionAttempts++;
          console.log(
            `[请求异常，重试] 第${connectionAttempts}次尝试...`,
            conversationId,
            fetchError,
          );
          // 延迟一点时间后重试
          await new Promise((resolve) =>
            setTimeout(resolve, RETRY_DELAY * connectionAttempts),
          );
          return makeStreamRequest();
        }
        // 其他错误或超过重试次数，直接抛出
        throw fetchError;
      }
    };

    // 启动请求
    await makeStreamRequest();
  } catch (error: unknown) {
    // 处理中止错误
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('请求中止错误已处理:', conversationId);
    } else if (!isAborted.value) {
      console.error('流式响应异常:', error);
      // 确保错误状态被处理
      handleStreamError({
        error: error instanceof Error ? error : new Error(String(error)),
        setStreamingState,
        setConversations,
        conversationId,
        onComplete,
        taskId,
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
  const controller = abortControllerRef.current[conversationId];

  if (controller) {
    try {
      // 中止控制器
      controller.abort();
      abortControllerRef.current[conversationId] = null;

      // 获取当前流式内容
      const currentState = streamingState[conversationId];
      if (currentState && (currentState.content || currentState.thinking)) {
        // 将当前状态添加为一条消息
        addInterruptedMessageToConversation({
          setConversations,
          conversationId,
          content: currentState.content,
          thinking: currentState.thinking,
        });

        // 清除待处理任务标记
        window.localStorage.removeItem(`pending_task_${conversationId}`);
      }

      // 重置流式状态
      resetStreamingState(setStreamingState, conversationId);
    } catch (error) {
      console.error('停止流式响应出错:', error);
    }
  }
}

/**
 * 处理流完成
 */
function handleStreamComplete({
  accumulatedContent,
  accumulatedThinking,
  setStreamingState,
  setConversations,
  conversationId,
  onComplete,
  taskId,
  isPartial = false,
}: {
  accumulatedContent: { value: string };
  accumulatedThinking: { value: string };
  setStreamingState: React.Dispatch<React.SetStateAction<StreamingState>>;
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  conversationId: string;
  onComplete?: (conversationId: string) => void;
  taskId: string;
  isPartial?: boolean;
}): void {
  try {
    // 添加AI回复消息
    const newMessage: Message = {
      id: generateUUID(),
      role: 'assistant',
      content: accumulatedContent.value.trim(),
      ...(accumulatedThinking.value
        ? { thinking: accumulatedThinking.value.trim() }
        : {}),
    };

    if (isPartial) {
      newMessage.content += '\n\n[由于服务超时，回答可能不完整]';
    }

    // 将消息添加到对话中
    addMessageToConversation({
      setConversations,
      conversationId,
      message: newMessage,
    });

    // 在任务存储中标记为完成
    completeTask(taskId, accumulatedContent.value, accumulatedThinking.value);

    // 清除待处理任务标记
    window.localStorage.removeItem(`pending_task_${conversationId}`);

    // 重置流式状态
    resetStreamingState(setStreamingState, conversationId);

    // 调用完成回调
    if (onComplete) {
      onComplete(conversationId);
    }
  } catch (error) {
    console.error('处理流完成出错:', error);
  }
}

/**
 * 处理流错误
 */
function handleStreamError({
  error,
  setStreamingState,
  setConversations,
  conversationId,
  onComplete,
  taskId,
}: {
  error: Error;
  setStreamingState: React.Dispatch<React.SetStateAction<StreamingState>>;
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  conversationId: string;
  onComplete?: (conversationId: string) => void;
  taskId: string;
}): void {
  try {
    // 添加错误消息
    const errorMessage: Message = {
      id: generateUUID(),
      role: 'assistant',
      content: `生成回答时出错: ${error.message}`,
    };

    // 将错误消息添加到对话中
    addMessageToConversation({
      setConversations,
      conversationId,
      message: errorMessage,
    });

    // 标记任务为错误状态
    markTaskError(taskId, error.message);

    // 清除待处理任务标记
    window.localStorage.removeItem(`pending_task_${conversationId}`);

    // 重置流式状态
    resetStreamingState(setStreamingState, conversationId);

    // 调用完成回调
    if (onComplete) {
      onComplete(conversationId);
    }
  } catch (callbackError) {
    console.error('处理流错误出错:', callbackError);
  }
}
