import OpenAI from 'openai';

// 配置星火大模型客户端
export const sparkClient = new OpenAI({
  apiKey: process.env.SPARK_API_PASSWORD || '',
  baseURL: 'https://spark-api-open.xf-yun.com/v1',
});

// 星火对话配置
export const SPARK_CONFIG = {
  model: 'lite',
  temperature: 0.7,
  stream: true, // 启用流式响应
};
