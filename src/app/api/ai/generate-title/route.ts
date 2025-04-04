import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { AIModelEnum } from '../_types';
import { getClientConfigForModel } from '../_config';

// 标题生成使用的模型ID
const TITLE_GENERATOR_MODEL = AIModelEnum.DeepSeekV30324;

/**
 * POST处理器 - 根据对话内容生成标题
 */
export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

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

    // 获取模型配置
    const clientConfig = getClientConfigForModel(TITLE_GENERATOR_MODEL);
    const aiClient = new OpenAI(clientConfig);

    console.log('使用模型生成标题:', TITLE_GENERATOR_MODEL);

    // 发送请求到AI模型获取标题
    const response = await aiClient.chat.completions.create({
      model: TITLE_GENERATOR_MODEL,
      messages: messages,
      max_tokens: 50,
      temperature: 0.3, // 降低温度以获得更稳定的结果
    });

    // 提取生成的标题
    const title = response.choices[0]?.message?.content?.trim() || '新对话';

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
