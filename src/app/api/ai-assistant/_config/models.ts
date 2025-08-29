/**
 * AI 模型配置
 * 包含所有支持的AI模型及其配置信息
 */

import {
  AIModelEnum,
  AIProviderEnum,
  ProviderConfig,
  ModelConfig,
  AIModel,
} from '@/types/ai-assistant';

/**
 * AI 服务提供商配置
 */
export const PROVIDERS_CONFIG: Record<AIProviderEnum, ProviderConfig> = {
  [AIProviderEnum.OPEN_ROUTER]: {
    baseURL: 'https://openrouter.ai/api/v1',
    apiKeys: [process.env.OPEN_ROUTER_API_KEY!],
  },
  [AIProviderEnum.GOOGLE]: {
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
    apiKeys: [
      process.env.GOOGLE_STUDIO_API_KEY!,
      process.env.GOOGLE_STUDIO_API_KEY2!,
    ],
  },
  [AIProviderEnum.FREE_CHAT_GPT]: {
    baseURL: 'https://free.v36.cm/v1',
    apiKeys: [process.env.FREE_CHAT_GPT_API_KEY!],
  },
  [AIProviderEnum.ZHIPU]: {
    baseURL: 'https://open.bigmodel.cn/api/paas/v4',
    apiKeys: [process.env.ZHIPU_API_KEY!],
  },
  [AIProviderEnum.CURSOR_PROXY]: {
    // 当前域名
    baseURL: process.env.NEXT_PUBLIC_APP_URL + '/api/cursor2openai/v1',
    apiKeys: [process.env.CURSOR_PROXY_API_KEY!],
  },
};

export const MODELS_CONFIG: Record<AIModelEnum, ModelConfig> = {
  [AIModelEnum.Default]: {
    displayName: 'default',
    instances: [
      {
        provider: AIProviderEnum.CURSOR_PROXY,
        modelId: 'default',
      },
    ],
  },
  [AIModelEnum.GPT5]: {
    displayName: 'gpt-5',
    instances: [
      {
        provider: AIProviderEnum.CURSOR_PROXY,
        modelId: 'gpt-5',
      },
    ],
  },
  [AIModelEnum.Gp4oMini]: {
    displayName: 'gpt-4o-mini',
    instances: [
      { provider: AIProviderEnum.FREE_CHAT_GPT, modelId: 'gpt-4o-mini' },
    ],
  },
  [AIModelEnum.DeepSeekV30324]: {
    displayName: 'DeepSeek-V3',
    instances: [
      {
        provider: AIProviderEnum.OPEN_ROUTER,
        modelId: 'deepseek/deepseek-chat-v3-0324:free',
      },
    ],
  },
  [AIModelEnum.DeepSeekV31]: {
    displayName: 'DeepSeek-V3.1',
    instances: [
      {
        provider: AIProviderEnum.OPEN_ROUTER,
        modelId: 'deepseek/deepseek-chat-v3.1:free',
      },
    ],
  },
  [AIModelEnum.DeepSeekR1]: {
    displayName: 'DeepSeek-R1',
    instances: [
      {
        provider: AIProviderEnum.OPEN_ROUTER,
        modelId: 'deepseek/deepseek-r1:free',
      },
    ],
  },
  // 专门用于对话内容生成标题的模型一类,不给用户展示，只用于生成标题
  [AIModelEnum.TitleGenerator]: {
    displayName: 'Title Generator',
    hideInUI: true,
    instances: [
      {
        provider: AIProviderEnum.GOOGLE,
        modelId: 'models/gemini-2.0-flash-lite',
      },
      {
        provider: AIProviderEnum.GOOGLE,
        modelId: 'models/gemini-2.0-flash-lite',
      },
      {
        provider: AIProviderEnum.ZHIPU,
        modelId: 'glm-4-flash',
      },
      {
        provider: AIProviderEnum.ZHIPU,
        modelId: 'glm-4-flash-250414',
      },
    ],
  },
  // 专门用于图像理解的模型一类,不给用户展示，只用于图像理解，告诉其他模型，图片内容是什么
  [AIModelEnum.ImageReader]: {
    displayName: 'Image Reader',
    hideInUI: true,
    instances: [
      {
        provider: AIProviderEnum.ZHIPU,
        modelId: 'glm-4v-flash',
      },
      {
        provider: AIProviderEnum.GOOGLE,
        modelId: 'models/gemini-2.0-flash-lite',
      },
      {
        provider: AIProviderEnum.GOOGLE,
        modelId: 'gemini-2.0-flash',
      },
    ],
  },
};

/**
 * 获取所有可用模型列表
 */
export function getAllModels(): AIModel[] {
  return Object.entries(MODELS_CONFIG)
    .filter(([, value]) => !value.hideInUI)
    .map(([key, value]) => ({
      id: key as AIModelEnum,
      name: value.displayName,
    }));
}

/**
 * 获取指定AI模型的客户端配置列表
 * @param selectedModel 选择的AI模型枚举值
 * @returns 返回一个包含该模型所有可用实例配置的对象数组
 * @throws 如果模型配置不存在则抛出错误
 */
export function getClientConfigForModel(selectedModel: AIModelEnum) {
  const modelConfig = MODELS_CONFIG[selectedModel];
  if (!modelConfig) {
    throw new Error(`模型配置不存在: ${selectedModel}`);
  }

  // 遍历所有实例，为每个实例生成完整的配置
  const configurations = modelConfig.instances.map((instance) => {
    const { provider, modelId } = instance;
    const providerConfig = PROVIDERS_CONFIG[provider];
    const { baseURL, apiKeys } = providerConfig;

    if (!apiKeys || apiKeys.length === 0) {
      throw new Error(`提供商 ${provider} 没有配置 API Key`);
    }

    // 从数组中随机选择一个 API Key
    const selectedApiKey = apiKeys[Math.floor(Math.random() * apiKeys.length)];

    return {
      baseURL,
      apiKey: selectedApiKey,
      modelId,
      provider,
    };
  });
  return configurations;
}
