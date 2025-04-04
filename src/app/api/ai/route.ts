import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import type {
  ChatCompletionChunk,
  ChatCompletionCreateParams,
} from 'openai/resources';

import { AIModelEnum } from './_types';
import { Message } from './_types';
import { getClientConfigForModel } from './_config';
import { handleStreamResponse } from './_utils/stream';

export const runtime = 'edge';

/**
 * 处理AI模型请求并返回流式响应
 */
async function handleAIModelRequest({
  messages,
  modelName,
}: {
  messages: Message[];
  modelName: AIModelEnum;
}) {
  // 获取客户端配置
  const clientConfig = getClientConfigForModel(modelName);
  const aiClient = new OpenAI(clientConfig);

  // 构建请求参数
  const requestOptions = {
    model: modelName,
    messages: messages as ChatCompletionCreateParams['messages'],
    stream: true,
  };

  try {
    // 调用AI API获取流式响应
    const response = await aiClient.chat.completions.create(requestOptions);

    // 创建流处理管道
    const stream = new ReadableStream({
      async start(controller) {
        await handleStreamResponse({
          response: response as AsyncIterable<ChatCompletionChunk>,
          controller,
        });
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
    console.error('AI API调用错误:', error);
    throw error;
  }
}

/**
 * POST请求处理器 - 用于流式响应和其他操作
 */
export async function POST(req: NextRequest) {
  try {
    const { messages, model } = await req.json();

    if (!model) {
      return new Response(JSON.stringify({ error: '没有提供有效的模型' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: '没有提供有效的消息' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return await handleAIModelRequest({ messages, modelName: model });
  } catch (error) {
    console.error('处理POST请求错误:', error);
    return new Response(JSON.stringify({ error: '服务器处理请求时出错' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
