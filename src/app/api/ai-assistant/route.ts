import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import type {
  ChatCompletionChunk,
  ChatCompletionCreateParams,
} from 'openai/resources';

import { getClientConfigForModel } from './_config';
import { handleStreamResponse } from './_utils/stream';
import { apiHandler } from '@/lib/api/handler';
import { createErrorResponse, createStreamResponse } from '@/lib/api/response';

export const runtime = 'edge';

/**
 * 处理AI模型请求并返回流式响应
 */

const handleAiRequest = apiHandler(async (req: NextRequest) => {
  const { messages, model } = await req.json();

  if (!model) {
    return createErrorResponse({
      message: '没有提供有效的模型',
    });
  }

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return createErrorResponse({
      message: '没有提供有效的消息',
    });
  }

  // 获取客户端配置
  const clientConfig = getClientConfigForModel(model);
  const aiClient = new OpenAI(clientConfig);

  // 构建请求参数
  const requestOptions = {
    model: model,
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
    return createStreamResponse(stream);
  } catch (error) {
    console.error('AI API调用错误:', error);
    throw error;
  }
});

export const POST = handleAiRequest;
