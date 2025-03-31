import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import type {
  ChatCompletionChunk,
  ChatCompletionCreateParams,
} from 'openai/resources';

// const keyList = [
//   {
//     baseURL: 'https://a.henhuoai.com/v1',
//     apiKey: 'sk-qY6gdsIUdeBJUKSVWqgZI6t1idJhqzAHmVHQM0LU7FWREJPY',
//     canUseModel: ['deepseek-ai/DeepSeek-R1', 'DeepSeek-V3-0324'],
//   },
//   {
//     baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
//     apiKey: 'AIzaSyBwnDATAbg6JZq4xRYyu_BwhwwEktEzdMQ',
//     canUseModel: [
//       'gemini-2.5-pro-exp-03-25',
//       'gemini-2.0-flash',
//       'gemini-1.5-pro-latest',
//     ],
//   },
// ];

// 直接在路由中创建客户端避免类型问题
const aiToolsClient = new OpenAI({
  apiKey: 'AIzaSyBwnDATAbg6JZq4xRYyu_BwhwwEktEzdMQ',
  baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
});

// 通用处理AI Tools API调用的函数
async function handleAIToolsRequest(
  messages: Array<{ role: string; content: string }>,
) {
  // 构建API请求参数
  const requestOptions = {
    model: 'gemini-2.5-pro-exp-03-25',
    messages: messages as ChatCompletionCreateParams['messages'],
    stream: true,
  };

  try {
    // 调用AI Tools API获取流式响应
    const response =
      await aiToolsClient.chat.completions.create(requestOptions);
    const list = await aiToolsClient.models.list();
    console.log('list', list);

    // 处理流式响应
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 处理每个流块
          for await (const chunk of response as AsyncIterable<ChatCompletionChunk>) {
            console.log('chunk.choices[0]?.delta', chunk.choices[0]?.delta);

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
    console.error('AI Tools API调用处理错误:', error);
    throw error;
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

    return await handleAIToolsRequest(messages);
  } catch (error) {
    console.error('AI Tools API调用出错:', error);
    return new Response(JSON.stringify({ error: '服务器处理请求时出错' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
