import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import type {
  ChatCompletionChunk,
  ChatCompletionCreateParams,
} from 'openai/resources';

// 启用Fluid Compute，设置最大执行时间为60秒（免费版最大限制）
export const maxDuration = 60;

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

// 添加任务类型定义
interface TaskInfo {
  taskId: string;
  status: 'pending' | 'completed' | 'error';
}

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
 * 将任务信息编码为SSE格式
 */
function encodeSSETaskInfo(taskInfo: TaskInfo) {
  const encoder = new TextEncoder();
  return encoder.encode(
    `data: ${JSON.stringify({ type: 'task', ...taskInfo })}\n\n`,
  );
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
async function handleAIModelRequest(
  messages: Message[],
  modelName: string,
  clientId?: string,
) {
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
          // 如果有客户端ID，则发送任务开始通知
          if (clientId) {
            const taskInfo: TaskInfo = {
              taskId: clientId,
              status: 'pending',
            };
            controller.enqueue(encodeSSETaskInfo(taskInfo));
          }

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
 * POST请求处理器 - 用于流式响应和其他操作
 */
export async function POST(req: NextRequest) {
  try {
    const requestData = await req.json();
    const { messages, model, clientId } = requestData;
    const modelName = model || 'gemini-2.5-pro-exp-03-25';

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: '没有提供有效的消息' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return await handleAIModelRequest(messages, modelName, clientId);
  } catch (error) {
    console.error('处理POST请求错误:', error);
    return new Response(JSON.stringify({ error: '服务器处理请求时出错' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * 获取任务状态 - 用于客户端轮询长时间运行的任务
 */
export async function GET(req: NextRequest) {
  try {
    const clientId = req.nextUrl.searchParams.get('clientId');

    if (!clientId) {
      return new Response(JSON.stringify({ error: '缺少任务ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 在实际实现中，这里应该从数据库或KV存储中获取任务状态
    // 由于这是一个简化示例，我们仅返回通用响应
    return new Response(
      JSON.stringify({
        taskId: clientId,
        status: 'pending',
        message: '任务正在处理中',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('处理GET请求错误:', error);
    return new Response(JSON.stringify({ error: '服务器处理请求时出错' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
