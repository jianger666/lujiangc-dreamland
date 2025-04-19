/**
 * AI 模型配置
 * 包含所有支持的AI模型及其配置信息
 */

import { AIModelEnum, APIProviderConfig, AIModel } from '@/types/ai-assistant';

/**
 * AI 服务提供商配置
 */
export const API_PROVIDERS: Record<string, APIProviderConfig> = {
  OPENROUTER: {
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
    models: [
      {
        id: AIModelEnum.DeepSeekChatV30324Free,
        name: 'deepseek/deepseek-chat-v3-0324:free',
      },
      {
        id: AIModelEnum.OpenRouterGemini25ProExp0325,
        name: 'google/gemini-2.5-pro-exp-03-25:free',
      },
      {
        id: AIModelEnum.OpenRouterGemini20FlashThinkingExp,
        name: 'google/gemini-2.0-flash-thinking-exp:free',
      },
    ],
  },
  XFYUN: {
    baseURL: 'https://spark-api-open.xf-yun.com/v1',
    apiKey: process.env.XFYUN_API_KEY,
    models: [
      {
        id: AIModelEnum.XFYunLite,
        name: 'xfyun/lite',
      },
      {
        id: AIModelEnum.XFYun4Ultra,
        name: 'xfyun/4-ultra',
      },
    ],
  },
  HENHUO: {
    baseURL: 'https://a.henhuoai.com/v1',
    apiKey: process.env.HENHUO_API_KEY,
    models: [
      { id: AIModelEnum.DeepSeekV30324, name: 'DeepSeek-V3-0324' },
      { id: AIModelEnum.DeepSeekR1, name: 'DeepSeek-R1' },
    ],
  },
  GOOGLE: {
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
    apiKey: process.env.GOOGLE_STUDIO_API_KEY,
    models: [
      { id: AIModelEnum.Gemini25ProExp0325, name: 'gemini-2.5-pro-exp-03-25' },
      { id: AIModelEnum.Gemini20Flash, name: 'gemini-2.0-flash' },
      { id: AIModelEnum.Gemini15ProLatest, name: 'gemini-1.5-pro-latest' },
    ],
  },
};

/**
 * 获取所有可用模型列表
 */
export function getAllModels(): AIModel[] {
  return Object.values(API_PROVIDERS).flatMap((provider) =>
    provider.models.map((model) => ({
      id: model.id,
      name: model.name || model.id,
    })),
  );
}

/**
 * 根据模型ID获取适当的API配置
 */
export function getClientConfigForModel(modelId: AIModelEnum) {
  // 遍历所有提供商查找模型
  for (const provider of Object.values(API_PROVIDERS)) {
    if (provider.models.some((model) => model.id === modelId)) {
      return {
        apiKey: provider.apiKey,
        baseURL: provider.baseURL,
      };
    }
  }
}
