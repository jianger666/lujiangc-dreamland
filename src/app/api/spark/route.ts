import { SPARK_CONFIG } from '@/lib/spark';
import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import type {
  ChatCompletionChunk,
  ChatCompletionCreateParams,
} from 'openai/resources';

// 直接在路由中创建客户端避免类型问题
const sparkClient = new OpenAI({
  apiKey: process.env.SPARK_API_PASSWORD || '',
  baseURL: 'https://spark-api-open.xf-yun.com/v1',
});

// 通用处理星火API调用的函数
async function handleSparkRequest(
  messages: Array<{ role: string; content: string }>,
) {
  // 构建API请求参数
  const requestOptions = {
    model: SPARK_CONFIG.model,
    messages: messages as ChatCompletionCreateParams['messages'],
    stream: true as const, // 使用const断言确保类型为true
  };

  try {
    // 调用星火API获取流式响应
    const response = await sparkClient.chat.completions.create(requestOptions);

    // 处理流式响应
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 处理每个流块
          for await (const chunk of response as AsyncIterable<ChatCompletionChunk>) {
            // 提取内容
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              // 将内容封装成SSE格式
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ content })}\n\n`),
              );
            }
          }
          // 发送完成标记
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('处理流式响应错误:', error);
          controller.error(error);
        }
      },
    });

    // 返回流式响应
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('星火API调用处理错误:', error);
    throw error;
  }
}

// 处理POST请求 - 用于fetch API
export async function POST(req: NextRequest) {
  try {
    // 解析请求体
    const body = await req.json();
    const { messages } = body;

    return await handleSparkRequest(messages);
  } catch (error) {
    console.error('星火API调用出错:', error);
    return new Response(JSON.stringify({ error: '服务器处理请求时出错' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// 处理GET请求 - 用于EventSource
export async function GET(req: NextRequest) {
  try {
    // 从URL参数获取消息
    const searchParams = req.nextUrl.searchParams;
    const messages: Array<{ role: string; content: string }> = [];

    // 解析消息参数
    // 参数格式为 messages[0][role], messages[0][content], messages[1][role], ...
    for (let i = 0; ; i++) {
      const role = searchParams.get(`messages[${i}][role]`);
      const content = searchParams.get(`messages[${i}][content]`);

      if (!role || !content) break;

      messages.push({ role, content });
    }

    if (messages.length === 0) {
      return new Response(JSON.stringify({ error: '没有提供消息' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return await handleSparkRequest(messages);
  } catch (error) {
    console.error('星火API调用出错:', error);
    return new Response(JSON.stringify({ error: '服务器处理请求时出错' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
