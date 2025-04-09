export enum AiRoleEnum {
  User = 'user',
  Assistant = 'assistant',
  System = 'system',
}

export interface Message {
  id: string;
  role: AiRoleEnum;
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
  id: AIModelEnum;
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

// API请求类型
export interface GenerateTitleRequest {
  messages: {
    role: AiRoleEnum;
    content: string;
  }[];
}

export interface ChatCompletionRequest {
  messages: Message[];
  model: string;
}

/**
 * 流式数据块类型
 */
export enum AiStreamChunkTypeEnum {
  Text = 'text',
  Think = 'think',
}

/**
 * 目前支持的所有AI模型
 */
export enum AIModelEnum {
  DeepSeekV30324 = 'DeepSeek-V3-0324',
  DeepSeekR1 = 'deepseek-ai/DeepSeek-R1',
  Gemini25ProExp0325 = 'gemini-2.5-pro-exp-03-25',
  Gemini20Flash = 'gemini-2.0-flash',
  Gemini15ProLatest = 'gemini-1.5-pro-latest',
  DeepSeekChatV30324Free = 'deepseek/deepseek-chat-v3-0324:free',
  OpenRouterGemini25ProExp0325 = 'google/gemini-2.5-pro-exp-03-25:free',
}

/**
 * API提供商配置类型
 */
export interface APIProviderConfig {
  baseURL: string;
  apiKey: string | undefined;
  models: AIModel[];
}
