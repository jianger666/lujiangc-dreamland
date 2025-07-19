export enum AiRoleEnum {
  User = "user",
  Assistant = "assistant",
  System = "system",
}

export interface Message {
  id: string;
  role: AiRoleEnum;
  content: string;
  thinking?: string;
  images?: string[];
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  selectedModel: AIModelEnum;
  createdAt: string;
  updatedAt: string;
  hasGeneratedTitle: boolean;
  isWebSearchEnabled: boolean;
}

export interface StreamingMessage {
  content: string;
  thinking: string;
  role?: never;
  id?: never;
  images?: string[];
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

export interface ChatCompletionRequest {
  messages: Message[];
  model: string;
}

/**
 * 流式数据块类型
 */
export enum AiStreamChunkTypeEnum {
  Text = "text",
  Think = "think",
}

export enum AIProviderEnum {
  OPEN_ROUTER = "OPEN_ROUTER",
  GOOGLE = "GOOGLE",
  ZHIPU = "ZHIPU",
  FREE_CHAT_GPT = "FREE_CHAT_GPT",
  CURSOR_PROXY = "CURSOR_PROXY",
}
export interface ProviderConfig {
  baseURL: string;
  apiKeys: string[];
}

export enum AIModelEnum {
  DeepSeekV30324 = "DeepSeekV30324",
  DeepSeekR1 = "DeepSeekR1",
  Default = "Default",
  Gp4oMini = "Gp4oMini",
  // 不是模型名称，专门用于对话内容生成标题的模型一类
  TitleGenerator = "TitleGenerator",
  // 不是模型名称，专门用于图像理解的模型一类
  ImageReader = "ImageReader",
}

export interface ModelConfig {
  displayName: string;
  instances: {
    provider: AIProviderEnum;
    modelId: string;
  }[];
  hideInUI?: boolean;
}

export interface AIModel {
  id: AIModelEnum;
  name: string;
}
