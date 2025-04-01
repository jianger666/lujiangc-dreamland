import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import type {
  ChatCompletionChunk,
  ChatCompletionCreateParams,
} from 'openai/resources';

// 预设API配置
const API_CONFIG = {
  DEEPSEEK: {
    baseURL: 'https://a.henhuoai.com/v1',
    apiKey: process.env.HENHUO_API_KEY,
    models: ['deepseek-ai/DeepSeek-R1', 'DeepSeek-V3-0324'],
  },
  GOOGLE: {
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
    apiKey: process.env.GEMINI_API_KEY,
    models: [
      'gemini-2.5-pro-exp-03-25',
      'gemini-2.0-flash',
      'gemini-1.5-pro-latest',
    ],
  },
};

// 消息类型定义
type Message = { role: string; content: string };
type StreamChunkType = 'text' | 'think';

/**
 * 根据模型名称获取适当的API客户端配置
 */
function getClientConfigForModel(modelName: string) {
  if (API_CONFIG.DEEPSEEK.models.includes(modelName)) {
    return {
      apiKey: API_CONFIG.DEEPSEEK.apiKey,
      baseURL: API_CONFIG.DEEPSEEK.baseURL,
    };
  }

  if (API_CONFIG.GOOGLE.models.includes(modelName)) {
    return {
      apiKey: API_CONFIG.GOOGLE.apiKey,
      baseURL: API_CONFIG.GOOGLE.baseURL,
    };
  }

  // 默认使用Gemini配置
  return {
    apiKey: API_CONFIG.GOOGLE.apiKey,
    baseURL: API_CONFIG.GOOGLE.baseURL,
  };
}

/**
 * 将数据编码为SSE格式
 */
function encodeSSEMessage(type: StreamChunkType, message: string) {
  const encoder = new TextEncoder();
  return encoder.encode(`data: ${JSON.stringify({ type, message })}\n\n`);
}

/**
 * 处理流式响应中的内容块
 */
async function handleStreamResponse(
  response: AsyncIterable<ChatCompletionChunk>,
  controller: ReadableStreamDefaultController,
) {
  const encoder = new TextEncoder();
  let isThinkMode = false;
  let isFirstTextBlock = true;
  let isFirstThinkBlock = true;

  // 处理流式响应
  for await (const chunk of response) {
    const content = chunk.choices[0]?.delta?.content || '';
    // 获取推理内容（如果存在）
    const reasoning =
      ((chunk.choices[0]?.delta as Record<string, unknown>)
        ?.reasoning as string) || '';
    const trimmedContent = content.trim();

    // 处理reasoning属性（某些模型专有）
    if (reasoning) {
      let processedReasoning = reasoning.replace(/\\n/g, '\n');

      if (isFirstThinkBlock && processedReasoning) {
        processedReasoning = processedReasoning.replace(/^[\n\r]+/, '');
        isFirstThinkBlock = false;
      }

      controller.enqueue(encodeSSEMessage('think', processedReasoning));
      continue;
    }

    // 处理<think>标签
    if (trimmedContent === '<think>') {
      isThinkMode = true;
      continue;
    }

    if (trimmedContent === '</think>') {
      isThinkMode = false;
      continue;
    }

    // 有实际内容时进行处理
    if (content) {
      let processedContent = content.replace(/\\n/g, '\n');
      if (isThinkMode) {
        // 处理思考内容

        if (isFirstThinkBlock && processedContent) {
          processedContent = processedContent.replace(/^[\n\r]+/, '');
          isFirstThinkBlock = false;
        }

        controller.enqueue(encodeSSEMessage('think', processedContent));
      } else {
        if (isFirstTextBlock && processedContent) {
          processedContent = processedContent.replace(/^[\n\r]+/, '');
          isFirstTextBlock = false;
        }

        controller.enqueue(encodeSSEMessage('text', processedContent));
      }
    }
  }

  // 发送完成标记
  controller.enqueue(encoder.encode('data: [DONE]\n\n'));
  controller.close();
}

/**
 * 处理AI模型请求并返回流式响应
 */
async function handleAIModelRequest(messages: Message[], modelName: string) {
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
        try {
          await handleStreamResponse(
            response as AsyncIterable<ChatCompletionChunk>,
            controller,
          );
        } catch (error) {
          console.error('流处理错误:', error);
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
    console.error('AI API调用错误:', error);
    throw error;
  }
}

/**
 * 从请求URL中解析消息数组
 */
function parseMessagesFromURL(searchParams: URLSearchParams): Message[] {
  const messages: Message[] = [];

  for (let i = 0; ; i++) {
    const role = searchParams.get(`messages[${i}][role]`);
    const content = searchParams.get(`messages[${i}][content]`);

    if (!role || !content) break;
    messages.push({ role, content });
  }

  return messages;
}

/**
 * GET请求处理器 - 用于EventSource流式响应
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const messages = parseMessagesFromURL(searchParams);
    const model = searchParams.get('model');
    if (!model) {
      return new Response(JSON.stringify({ error: '没有提供模型名称' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (messages.length === 0) {
      return new Response(JSON.stringify({ error: '没有提供消息' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return await handleAIModelRequest(messages, model);
  } catch (error) {
    console.error('处理GET请求错误:', error);
    return new Response(JSON.stringify({ error: '服务器处理请求时出错' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * POST请求处理器 - 用于流式响应和其他操作
 */
export async function POST(req: NextRequest) {
  try {
    const requestData = await req.json();
    const { messages, model } = requestData;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: '没有提供有效的消息' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return await handleAIModelRequest(messages, model);
  } catch (error) {
    console.error('处理POST请求错误:', error);
    return new Response(JSON.stringify({ error: '服务器处理请求时出错' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
