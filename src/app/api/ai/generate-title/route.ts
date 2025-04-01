import { NextRequest } from 'next/server';
import OpenAI from 'openai';

// 设置DeepSeek客户端配置
const DEEPSEEK_CONFIG = {
  baseURL: process.env.DEEPSEEK_API_BASE_URL || 'https://a.henhuoai.com/v1',
  apiKey:
    process.env.DEEPSEEK_API_KEY ||
    'sk-qY6gdsIUdeBJUKSVWqgZI6t1idJhqzAHmVHQM0LU7FWREJPY',
  model: 'DeepSeek-V3-0324',
};

/**
 * POST处理器 - 根据对话内容生成标题
 */
export async function POST(req: NextRequest) {
  console.log('标题生成API被调用');

  try {
    const { messages } = await req.json();

    console.log('接收到标题生成请求，消息数:', messages?.length);

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.error('无效的消息格式');
      return new Response(
        JSON.stringify({ error: '无效的消息格式', title: '新对话' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    // 使用DeepSeek模型
    const aiClient = new OpenAI({
      apiKey: DEEPSEEK_CONFIG.apiKey,
      baseURL: DEEPSEEK_CONFIG.baseURL,
    });

    console.log('使用模型生成标题:', DEEPSEEK_CONFIG.model);

    // 发送请求到AI模型获取标题
    const response = await aiClient.chat.completions.create({
      model: DEEPSEEK_CONFIG.model,
      messages: messages,
      max_tokens: 50,
      temperature: 0.3, // 降低温度以获得更稳定的结果
    });

    // 提取生成的标题
    const title = response.choices[0]?.message?.content?.trim() || '新对话';
    console.log('生成的标题:', title);

    return new Response(JSON.stringify({ title }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('生成标题错误:', error);
    return new Response(
      JSON.stringify({ error: '生成标题失败', title: '新对话' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}
