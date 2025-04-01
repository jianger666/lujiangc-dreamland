import { AIModel, Conversation, Message, StreamingMessage } from '../types';

/**
 * 创建新对话
 */
export function createNewConversation(
  modelId: string,
  existingConversations: Conversation[],
  availableModels: AIModel[],
): Conversation {
  const now = new Date().toISOString();
  return {
    id: `conv-${Date.now()}`,
    title: `新对话 ${existingConversations.length + 1}`,
    messages: [],
    modelId: modelId || availableModels[0]?.id || 'gemini-2.5-pro-exp-03-25',
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * 获取可用模型
 */
export async function fetchAvailableModels(): Promise<AIModel[]> {
  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'getAvailableModels' }),
    });

    const data = await response.json();

    if (data.models && Array.isArray(data.models)) {
      return data.models;
    }

    return [];
  } catch (error) {
    console.error('获取模型列表失败:', error);
    return [];
  }
}

/**
 * 使用EventSource处理流式响应
 */
export function handleStreamWithEventSource(
  messages: Message[],
  modelId: string,
  eventSourceRef: React.MutableRefObject<EventSource | null>,
  setStreamingMessage: React.Dispatch<React.SetStateAction<StreamingMessage>>,
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>,
  updateConversationWithMessage: (message: Message) => void,
  conversations: Conversation[],
  activeConversationId: string,
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>,
): EventSource {
  // 清理现有的EventSource
  if (eventSourceRef.current) {
    eventSourceRef.current.close();
  }

  setStreamingMessage({ content: '', thinking: '' });
  let accumulatedContent = '';
  let accumulatedThinking = '';

  // 构建查询参数
  const params = new URLSearchParams();
  params.append('model', modelId);

  // 添加消息
  messages.forEach((msg, index) => {
    params.append(`messages[${index}][role]`, msg.role);
    params.append(`messages[${index}][content]`, msg.content);
  });

  // 创建新的EventSource
  const eventSource = new EventSource(`/api/ai?${params.toString()}`);
  eventSourceRef.current = eventSource;

  // 处理消息事件
  eventSource.onmessage = (event) => {
    try {
      if (event.data === '[DONE]') {
        eventSource.close();

        // 流结束，将累积的消息添加到消息列表
        if (accumulatedContent || accumulatedThinking) {
          const newMessage: Message = {
            id: Date.now().toString(),
            role: 'assistant',
            content: accumulatedContent,
          };

          if (accumulatedThinking) {
            newMessage.thinking = accumulatedThinking;
          }

          // 更新对话
          const updatedConversations = conversations.map((conv) =>
            conv.id === activeConversationId
              ? {
                  ...conv,
                  messages: [...conv.messages, newMessage],
                  updatedAt: new Date().toISOString(),
                }
              : conv,
          );

          setConversations(updatedConversations);
          setStreamingMessage({ content: '', thinking: '' });
        }
        setIsLoading(false);
        return;
      }

      const parsedData = JSON.parse(event.data);

      // 根据消息类型更新内容
      if (parsedData.type === 'text') {
        // 确保消息不为空
        if (parsedData.message && parsedData.message.trim()) {
          accumulatedContent += parsedData.message;
          setStreamingMessage((prev: StreamingMessage) => ({
            ...prev,
            content: accumulatedContent,
          }));
        }
      } else if (parsedData.type === 'think') {
        // 确保思考内容不为空
        if (parsedData.message && parsedData.message.trim()) {
          accumulatedThinking += parsedData.message;
          setStreamingMessage((prev: StreamingMessage) => ({
            ...prev,
            thinking: accumulatedThinking,
          }));
        }
      }
    } catch (error) {
      console.error('解析响应数据出错:', error);
    }
  };

  // 处理错误
  eventSource.onerror = (error) => {
    console.error('EventSource 错误:', error);
    eventSource.close();
    setIsLoading(false);

    // 添加错误消息
    const errorMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: '抱歉，我暂时无法回答您的问题。请稍后再试或尝试其他问题。',
    };

    // 使用当前的conversations状态更新
    setConversations((currentConversations: Conversation[]) => {
      return currentConversations.map((conv: Conversation) =>
        conv.id === activeConversationId
          ? {
              ...conv,
              messages: [...conv.messages, errorMessage],
              updatedAt: new Date().toISOString(),
            }
          : conv,
      );
    });
  };

  return eventSource;
}
