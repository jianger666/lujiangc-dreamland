export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  thinking?: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  modelId: string;
  createdAt: string;
  updatedAt: string;
  hasGeneratedTitle: boolean;
}

export interface AIModel {
  id: string;
  name: string;
}

export interface StreamingMessage {
  content: string;
  thinking: string;
}

// 单个对话的流式状态
export interface ConversationStreamState {
  content: string;
  thinking: string;
  isLoading: boolean;
}

// 所有对话的流式状态映射
export interface StreamingState {
  [conversationId: string]: ConversationStreamState;
}
