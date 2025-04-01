import {
  AIModel,
  Conversation,
  Message,
  StreamingState,
  ConversationStreamState,
} from '../types';
import { generateUUID } from '@/lib/uuid';

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
      model: 'DeepSeek-V3-0324',
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
        accumulatedContent.value += message;
        updateStreamingContent(
          setStreamingState,
          conversationId,
          accumulatedContent.value,
        );
        break;

      case 'think':
        accumulatedThinking.value += message;
        updateStreamingThinking(
          setStreamingState,
          conversationId,
          accumulatedThinking.value,
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
