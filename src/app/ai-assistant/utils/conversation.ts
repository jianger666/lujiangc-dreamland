import {
  AIModel,
  Conversation,
  Message,
  StreamingState,
  ConversationStreamState,
} from '../types';
import { generateUUID } from '@/lib/uuid';
import { fetchEventSource } from '@microsoft/fetch-event-source';

/**
 * 创建新对话
 * @param modelId 模型ID
 * @param existingConversations 现有对话列表
 * @param availableModels 可用模型列表
 * @returns 新创建的对话
 */
export function createNewConversation(
  modelId: string,
  existingConversations: Conversation[],
  availableModels: AIModel[],
): Conversation {
  const now = new Date().toISOString();
  return {
    id: generateUUID(),
    title: `新对话`,
    messages: [],
    modelId: modelId || availableModels[0]?.id || 'gemini-2.5-pro-exp-03-25',
    createdAt: now,
    updatedAt: now,
    hasGeneratedTitle: false,
  };
}

/**
 * 根据对话内容自动生成标题
 * @param messages 对话消息列表
 * @returns 生成的标题
 */
export async function generateConversationTitle(
  messages: Message[],
): Promise<string> {
  // 如果没有消息，返回默认标题
  if (!messages?.length) return '新对话';

  try {
    // 提取用户最初的问题
    const userMessages = messages.filter((msg) => msg.role === 'user');
    if (!userMessages.length) return '新对话';

    // 获取第一条用户消息，并限制长度
    const firstUserMsg = userMessages[0].content.slice(0, 200);

    // 构建系统提示和用户消息
    const requestBody = {
      messages: [
        {
          role: 'system',
          content:
            '你是一个标题生成助手。根据用户的提问生成一个简短的标题（10个字以内），标题应该概括对话的主题或目的。只返回标题，不要包含任何其他文字或标点符号。',
        },
        { role: 'user', content: firstUserMsg },
      ],
    };

    // 发送请求到API
    const response = await fetch('/api/ai/generate-title', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`生成标题失败: ${response.status}`);
    }

    const data = await response.json();

    // 处理API返回的数据
    if (data.title && typeof data.title === 'string') {
      return (
        data.title.trim().slice(0, 20) || extractFallbackTitle(userMessages[0])
      );
    }

    // 无有效标题时使用回退方案
    return extractFallbackTitle(userMessages[0]);
  } catch (error) {
    console.error('生成标题失败:', error);

    // 错误时使用回退方案
    const userMessages = messages.filter((msg) => msg.role === 'user');
    return userMessages.length
      ? extractFallbackTitle(userMessages[0])
      : '新对话';
  }
}

// 从用户消息提取回退标题
function extractFallbackTitle(message: Message): string {
  return message.content.slice(0, 15) + '...';
}

/**
 * 获取可用模型
 * @returns 可用的AI模型列表
 */
export async function fetchAvailableModels(): Promise<AIModel[]> {
  try {
    const response = await fetch('/api/ai/models', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return data.models && Array.isArray(data.models) ? data.models : [];
  } catch (error) {
    console.error('获取模型列表失败:', error);
    return [];
  }
}

/**
 * 更新流式状态
 * @param param0 更新参数对象
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
 * 添加消息到对话
 * @param param0 添加消息参数对象
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
 * 处理完成的流式响应
 */
function handleStreamComplete({
  eventSource,
  accumulatedContent,
  accumulatedThinking,
  setStreamingState,
  setConversations,
  conversationId,
}: {
  eventSource: EventSource;
  accumulatedContent: { value: string };
  accumulatedThinking: { value: string };
  setStreamingState: React.Dispatch<React.SetStateAction<StreamingState>>;
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  conversationId: string;
}) {
  eventSource.close();

  // 流结束，将累积的消息添加到消息列表
  if (accumulatedContent.value || accumulatedThinking.value) {
    const newMessage: Message = {
      id: generateUUID(),
      role: 'assistant',
      content: accumulatedContent.value,
      ...(accumulatedThinking.value
        ? { thinking: accumulatedThinking.value }
        : {}),
    };

    // 更新对话
    addMessageToConversation({
      setConversations,
      conversationId,
      message: newMessage,
    });
  }

  // 重置状态
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
 * 处理流式响应数据
 */
function handleStreamData(
  event: MessageEvent,
  {
    accumulatedContent,
    accumulatedThinking,
    setStreamingState,
    conversationId,
  }: {
    accumulatedContent: { value: string };
    accumulatedThinking: { value: string };
    setStreamingState: React.Dispatch<React.SetStateAction<StreamingState>>;
    conversationId: string;
  },
): void {
  try {
    const parsedData = JSON.parse(event.data);
    const message = parsedData.message?.trim();

    // 无消息内容时直接返回
    if (!message) return;

    // 根据消息类型更新不同的状态
    switch (parsedData.type) {
      case 'text':
        processAccumulatedContent(accumulatedContent, message, (content) =>
          updateStreamingContent(setStreamingState, conversationId, content),
        );
        break;

      case 'think':
        processAccumulatedContent(accumulatedThinking, message, (content) =>
          updateStreamingThinking(setStreamingState, conversationId, content),
        );
        break;

      default:
        // 未知消息类型，记录日志但不处理
        console.warn('未知流式消息类型:', parsedData.type);
    }
  } catch (error) {
    console.error('解析流式响应数据失败:', error);
  }
}

// 更新流式文本内容
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

// 更新流式思考内容
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

/**
 * 使用EventSource处理流式响应
 */
export function handleStreamWithEventSource(
  messages: Message[],
  modelId: string,
  eventSourceRef: { current: EventSource | null },
  setStreamingState: React.Dispatch<React.SetStateAction<StreamingState>>,
  conversationId: string,
  conversations: Conversation[],
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>,
  onStreamingComplete?: (conversationId: string) => void,
): EventSource {
  // 清理现有的EventSource
  if (eventSourceRef.current) {
    eventSourceRef.current.close();
  }

  // 初始化当前对话的流式状态
  initializeStreamingState(setStreamingState, conversationId);

  // 使用对象引用以便在回调函数中更新
  const accumulatedContent = { value: '' };
  const accumulatedThinking = { value: '' };

  // 创建新的EventSource
  const eventSource = createEventSource(modelId, messages);
  eventSourceRef.current = eventSource;

  console.log('创建新的EventSource:', conversationId);

  // 自定义完成处理函数
  const handleCustomStreamComplete = () => {
    console.log('流处理完成，准备关闭EventSource:', conversationId);

    handleStreamComplete({
      eventSource,
      accumulatedContent,
      accumulatedThinking,
      setStreamingState,
      setConversations,
      conversationId,
    });

    // 调用完成回调
    if (onStreamingComplete) {
      console.log('调用流处理完成回调:', conversationId);
      onStreamingComplete(conversationId);
    }

    return true;
  };

  // 设置事件处理器
  setupEventHandlers(
    eventSource,
    accumulatedContent,
    accumulatedThinking,
    setStreamingState,
    conversationId,
    setConversations,
    handleCustomStreamComplete,
    onStreamingComplete,
  );

  return eventSource;
}

/**
 * 初始化流式状态
 */
function initializeStreamingState(
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
 * 创建EventSource实例
 */
function createEventSource(modelId: string, messages: Message[]): EventSource {
  // 构建查询参数
  const params = new URLSearchParams();
  params.append('model', modelId);

  // 添加消息
  messages.forEach((msg, index) => {
    params.append(`messages[${index}][role]`, msg.role);
    params.append(`messages[${index}][content]`, msg.content);
  });

  // 返回新的EventSource
  return new EventSource(`/api/ai?${params.toString()}`);
}

/**
 * 设置EventSource的事件处理器
 */
function setupEventHandlers(
  eventSource: EventSource,
  accumulatedContent: { value: string },
  accumulatedThinking: { value: string },
  setStreamingState: React.Dispatch<React.SetStateAction<StreamingState>>,
  conversationId: string,
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>,
  handleCustomStreamComplete: () => boolean,
  onStreamingComplete?: (conversationId: string) => void,
): void {
  // 处理消息事件
  eventSource.onmessage = (event) => {
    // 检查是否完成
    if (event.data === '[DONE]') {
      console.log('收到[DONE]事件，准备结束流处理:', conversationId);
      handleCustomStreamComplete();
      return;
    }

    handleStreamData(event, {
      accumulatedContent,
      accumulatedThinking,
      setStreamingState,
      conversationId,
    });
  };

  // 处理错误
  eventSource.onerror = (error) => {
    console.error('EventSource 错误:', error, conversationId);
    eventSource.close();

    // 添加错误消息
    const errorMessage: Message = {
      id: generateUUID(),
      role: 'assistant',
      content: '抱歉，我暂时无法回答您的问题。请稍后再试或尝试其他问题。',
    };

    // 更新对话
    addMessageToConversation({
      setConversations,
      conversationId,
      message: errorMessage,
    });

    // 重置状态
    updateStreamState({
      setStreamingState,
      conversationId,
      updates: {
        content: '',
        thinking: '',
        isLoading: false,
      },
    });

    // 流处理发生错误时也调用完成回调
    if (onStreamingComplete) {
      console.log('因错误调用流处理完成回调:', conversationId);
      onStreamingComplete(conversationId);
    }
  };
}

/**
 * 使用FetchEventSource处理流式响应（支持POST请求）
 */
export async function handleStreamWithFetchEventSource(
  messages: Message[],
  modelId: string,
  abortControllerRef: { current: AbortController | null },
  setStreamingState: React.Dispatch<React.SetStateAction<StreamingState>>,
  conversationId: string,
  conversations: Conversation[],
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>,
  onStreamingComplete?: (conversationId: string) => void,
) {
  // 清理现有的请求
  if (abortControllerRef.current) {
    abortControllerRef.current.abort();
  }

  // 创建新的AbortController
  const abortController = new AbortController();
  abortControllerRef.current = abortController;

  // 初始化当前对话的流式状态
  initializeStreamingState(setStreamingState, conversationId);

  // 使用对象引用以便在回调函数中更新
  const accumulatedContent = { value: '' };
  const accumulatedThinking = { value: '' };

  try {
    console.log('启动FetchEventSource流式响应:', conversationId);

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
        // 检查是否完成
        if (event.data === '[DONE]') {
          console.log('收到[DONE]事件，准备结束流处理:', conversationId);

          // 流结束，将累积的消息添加到消息列表
          if (accumulatedContent.value || accumulatedThinking.value) {
            const newMessage: Message = {
              id: generateUUID(),
              role: 'assistant',
              content: accumulatedContent.value,
              ...(accumulatedThinking.value
                ? { thinking: accumulatedThinking.value }
                : {}),
            };

            // 更新对话
            addMessageToConversation({
              setConversations,
              conversationId,
              message: newMessage,
            });
          }

          // 重置状态
          updateStreamState({
            setStreamingState,
            conversationId,
            updates: {
              content: '',
              thinking: '',
              isLoading: false,
            },
          });

          // 调用完成回调
          if (onStreamingComplete) {
            console.log('调用流处理完成回调:', conversationId);
            onStreamingComplete(conversationId);
          }

          return;
        }

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
        console.error('FetchEventSource 错误:', error, conversationId);

        // 添加错误消息
        const errorMessage: Message = {
          id: generateUUID(),
          role: 'assistant',
          content: '抱歉，我暂时无法回答您的问题。请稍后再试或尝试其他问题。',
        };

        // 更新对话
        addMessageToConversation({
          setConversations,
          conversationId,
          message: errorMessage,
        });

        // 重置状态
        updateStreamState({
          setStreamingState,
          conversationId,
          updates: {
            content: '',
            thinking: '',
            isLoading: false,
          },
        });

        // 流处理发生错误时也调用完成回调
        if (onStreamingComplete) {
          console.log('因错误调用流处理完成回调:', conversationId);
          onStreamingComplete(conversationId);
        }

        // 抛出错误以终止fetchEventSource
        throw error;
      },
    });
  } catch (error: unknown) {
    // 忽略被用户主动取消的请求错误
    if (error instanceof Error && error.name === 'AbortError') {
      // 被用户主动取消的请求，不做额外处理
    } else {
      console.error('FetchEventSource异常:', error);
    }
  }

  return abortController;
}

/**
 * 智能管理聊天历史记录，根据最佳实践优化传递给AI的上下文
 * 策略：
 * 1. 保留系统消息
 * 2. 保留最近N条对话记录
 * 3. 如果上下文太长，进行压缩或添加摘要
 *
 * @param messages 完整的消息记录
 * @param maxTokens 最大允许的令牌数（估算值）
 * @returns 优化后的消息记录
 */
export function optimizeConversationHistory(
  messages: Message[],
  maxTokens: number = 4000,
): Message[] {
  // 如果消息少于8条，无需优化
  if (messages.length <= 8) return messages;

  // 长度估算系数 - 一般一个单词约1.3个令牌，中文每个字约占1个令牌
  const estimateTokens = (text: string): number => {
    if (!text) return 0;
    // 针对中文特殊处理
    // 简单估计，中文一个字约1个令牌，英文一个单词约1.3个令牌
    const chineseChars = text.match(/[\u4e00-\u9fa5]/g)?.length || 0;
    const englishWords = text.match(/[a-zA-Z]+/g)?.length || 0;
    const numbers = text.match(/\d+/g)?.length || 0;
    const symbols = text.match(/[^\w\s\u4e00-\u9fa5]/g)?.length || 0;

    return chineseChars + englishWords * 1.3 + numbers + symbols;
  };

  const estimateMessageTokens = (msg: Message): number => {
    let total = estimateTokens(msg.content);
    if (msg.thinking) {
      total += estimateTokens(msg.thinking);
    }
    // 角色和元数据的开销
    total += 4;
    return total;
  };

  // 步骤1: 找出所有系统消息
  const systemMessages = messages.filter((msg) => msg.role === 'system');

  // 步骤2: 计算非系统消息
  const nonSystemMessages = messages.filter((msg) => msg.role !== 'system');

  // 步骤3: 保证用户最新的问题一定会被包含
  let userLastQuestion: Message | null = null;
  for (let i = nonSystemMessages.length - 1; i >= 0; i--) {
    if (nonSystemMessages[i].role === 'user') {
      userLastQuestion = nonSystemMessages[i];
      break;
    }
  }

  // 步骤4: 从最新消息开始，尽可能多地保留消息对
  const recentMessages: Message[] = [];
  let currentTokenCount = systemMessages.reduce(
    (acc, msg) => acc + estimateMessageTokens(msg),
    0,
  );

  // 预留给最新用户问题的令牌数
  if (userLastQuestion) {
    currentTokenCount += estimateMessageTokens(userLastQuestion);
  }

  // 从最新消息开始，向前添加尽可能多的消息
  let i = nonSystemMessages.length - 1;

  // 首先添加最新用户问题
  if (
    userLastQuestion &&
    i >= 0 &&
    nonSystemMessages[i].id === userLastQuestion.id
  ) {
    recentMessages.unshift(nonSystemMessages[i]);
    i--;
  }

  // 继续添加更多消息，直到达到令牌限制
  while (i >= 0) {
    const message = nonSystemMessages[i];
    const tokenEstimate = estimateMessageTokens(message);

    // 如果添加这条消息会超出令牌限制，停止添加
    if (currentTokenCount + tokenEstimate > maxTokens) {
      break;
    }

    // 添加消息
    recentMessages.unshift(message);
    currentTokenCount += tokenEstimate;
    i--;
  }

  // 步骤5: 如果最新用户问题尚未添加（因为它不是最后一条消息），现在添加它
  if (
    userLastQuestion &&
    !recentMessages.some((msg) => msg.id === userLastQuestion?.id)
  ) {
    recentMessages.push(userLastQuestion);
  }

  // 步骤6: 如果有足够空间，添加一条摘要消息
  if (i >= 0 && currentTokenCount < maxTokens - 200) {
    const skippedCount = i + 1;
    if (skippedCount > 0) {
      const summaryMessage: Message = {
        id: 'history-summary',
        role: 'system',
        content: `[系统提示: 这里省略了 ${skippedCount} 条较早的对话消息，下面是最近的对话内容]`,
      };
      recentMessages.unshift(summaryMessage);
    }
  }

  // 步骤7: 合并系统消息和优化后的最近消息
  return [...systemMessages, ...recentMessages];
}
