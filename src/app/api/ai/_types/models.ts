/**
 * AI模型相关类型定义
 */

/**
 * AI消息类型
 */
export interface Message {
  role: string;
  content: string;
}

/**
 * 流式数据块类型
 */
export type StreamChunkType = 'text' | 'think';

/**
 * 目前支持的所有AI模型
 */
export enum AIModelEnum {
  DeepSeekV30324 = 'DeepSeek-V3-0324',
  DeepSeekR1 = 'deepseek-ai/DeepSeek-R1',
  Gemini25ProExp0325 = 'gemini-2.5-pro-exp-03-25',
  Gemini20Flash = 'gemini-2.0-flash',
  Gemini15ProLatest = 'gemini-1.5-pro-latest',
}

/**
 * AI模型类型
 */
export interface AIModel {
  id: AIModelEnum;
  name: string;
}

/**
 * API提供商配置类型
 */
export interface ProviderConfig {
  baseURL: string;
  apiKey: string | undefined;
  models: AIModel[];
}

/**
 * API客户端配置类型
 */
export interface ClientConfig {
  apiKey: string | undefined;
  baseURL: string;
}
