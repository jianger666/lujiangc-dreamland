export interface Message {
  id: string;
  role: 'user' | 'assistant';
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
}

export interface AIModel {
  id: string;
  provider: string;
}

export interface StreamingMessage {
  content: string;
  thinking: string;
}
