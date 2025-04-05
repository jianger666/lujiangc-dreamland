import { AIModel, Conversation, Message } from '../types';
import { generateUUID } from '@/lib/uuid';

/**
 * 创建新对话
 * @param modelId 模型ID
 * @param existingConversations 现有对话列表
 * @param availableModels 可用模型列表
 * @returns 新创建的对话
 */
export function createNewConversation(
  modelId: string,
  existingConversations: Conversation[],
  availableModels: AIModel[],
): Conversation {
  const now = new Date().toISOString();
  return {
    id: generateUUID(),
    title: `新对话`,
    messages: [],
    modelId: modelId || availableModels[0]?.id || 'gemini-2.5-pro-exp-03-25',
    createdAt: now,
    updatedAt: now,
    hasGeneratedTitle: false,
  };
}

/**
 * 根据对话内容自动生成标题
 * @param messages 对话消息列表
 * @returns 生成的标题
 */
export async function generateConversationTitle(
  messages: Message[],
): Promise<string> {
  // 如果没有消息，返回默认标题
  if (!messages?.length) return '新对话';

  try {
    // 提取用户最初的问题
    const userMessages = messages.filter((msg) => msg.role === 'user');
    if (!userMessages.length) return '新对话';

    // 获取第一条用户消息，并限制长度
    const firstUserMsg = userMessages[0].content.slice(0, 200);

    // 构建系统提示和用户消息
    const requestBody = {
      messages: [
        {
          role: 'system',
          content:
            '你是一个标题生成助手。根据用户的提问生成一个简短的标题（10个字以内），标题应该概括对话的主题或目的。只返回标题，不要包含任何其他文字或标点符号。',
        },
        { role: 'user', content: firstUserMsg },
      ],
    };

    // 发送请求到API
    const response = await fetch('/api/ai/generate-title', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`生成标题失败: ${response.status}`);
    }

    const { data: title } = await response.json();

    // 处理API返回的数据
    if (title && typeof title === 'string') {
      return title.trim().slice(0, 20) || extractFallbackTitle(userMessages[0]);
    }

    // 无有效标题时使用回退方案
    return extractFallbackTitle(userMessages[0]);
  } catch (error) {
    console.error('生成标题失败:', error);

    // 错误时使用回退方案
    const userMessages = messages.filter((msg) => msg.role === 'user');
    return userMessages.length
      ? extractFallbackTitle(userMessages[0])
      : '新对话';
  }
}

// 从用户消息提取回退标题
function extractFallbackTitle(message: Message): string {
  return message.content.slice(0, 15) + '...';
}

/**
 * 获取可用模型
 * @returns 可用的AI模型列表
 */
export async function fetchAvailableModels(): Promise<AIModel[]> {
  try {
    const response = await fetch('/api/ai/models', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const { data: models } = await response.json();

    return models && Array.isArray(models) ? models : [];
  } catch (error) {
    console.error('获取模型列表失败:', error);
    return [];
  }
}

/**
 * 智能管理聊天历史记录，根据最佳实践优化传递给AI的上下文
 *
 * 该函数通过以下策略优化聊天历史记录：
 * 1. 保留所有系统消息，确保AI模型能够遵循系统指令
 * 2. 保证用户最新的问题一定会被包含，确保AI能回答当前问题
 * 3. 尽可能地保留最近的对话记录，遵循"最近优先"原则
 * 4. 当对话长度超过限制时，添加摘要信息说明省略了多少早期消息
 * 5. 智能估算每条消息的令牌长度，确保不超过模型的最大上下文窗口
 *
 * @param messages 完整的消息记录
 * @param maxTokens 最大允许的令牌数（估算值），默认4000
 * @returns 优化后的消息记录
 */
export function optimizeConversationHistory(
  messages: Message[],
  maxTokens: number = 4000,
): Message[] {
  // 如果消息少于8条，无需优化
  if (messages.length <= 8) return messages;

  // 令牌估算函数 - 计算文本中的令牌数量
  const estimateTokens = (text: string): number => {
    if (!text) return 0;
    // 针对中文和英文的特殊处理
    // 简单估计：中文一个字约1个令牌，英文一个单词约1.3个令牌
    const chineseChars = text.match(/[\u4e00-\u9fa5]/g)?.length || 0;
    const englishWords = text.match(/[a-zA-Z]+/g)?.length || 0;
    const numbers = text.match(/\d+/g)?.length || 0;
    const symbols = text.match(/[^\w\s\u4e00-\u9fa5]/g)?.length || 0;

    return chineseChars + englishWords * 1.3 + numbers + symbols;
  };

  // 估算一条消息的总令牌数（包括内容、思考过程和元数据）
  const estimateMessageTokens = (msg: Message): number => {
    let total = estimateTokens(msg.content);
    if (msg.thinking) {
      total += estimateTokens(msg.thinking);
    }
    // 角色和元数据的开销（如role: "user", id: "xxx"等）
    total += 4;
    return total;
  };

  // 步骤1: 找出所有系统消息（优先保留的指令消息）
  const systemMessages = messages.filter((msg) => msg.role === 'system');

  // 步骤2: 计算非系统消息（用户和助手的对话内容）
  const nonSystemMessages = messages.filter((msg) => msg.role !== 'system');

  // 步骤3: 保证用户最新的问题一定会被包含（确保能回答最新问题）
  let userLastQuestion: Message | null = null;
  for (let i = nonSystemMessages.length - 1; i >= 0; i--) {
    if (nonSystemMessages[i].role === 'user') {
      userLastQuestion = nonSystemMessages[i];
      break;
    }
  }

  // 步骤4: 从最新消息开始，尽可能多地保留最近的消息对
  const recentMessages: Message[] = [];

  // 计算系统消息已占用的令牌数
  let currentTokenCount = systemMessages.reduce(
    (acc, msg) => acc + estimateMessageTokens(msg),
    0,
  );

  // 预留给最新用户问题的令牌数
  if (userLastQuestion) {
    currentTokenCount += estimateMessageTokens(userLastQuestion);
  }

  // 从最新消息开始，向前添加尽可能多的消息
  let i = nonSystemMessages.length - 1;

  // 首先添加最新用户问题（如果是最后一条消息）
  if (
    userLastQuestion &&
    i >= 0 &&
    nonSystemMessages[i].id === userLastQuestion.id
  ) {
    recentMessages.unshift(nonSystemMessages[i]);
    i--;
  }

  // 继续添加更多消息，直到达到令牌限制
  while (i >= 0) {
    const message = nonSystemMessages[i];
    const tokenEstimate = estimateMessageTokens(message);

    // 如果添加这条消息会超出令牌限制，停止添加
    if (currentTokenCount + tokenEstimate > maxTokens) {
      break;
    }

    // 添加消息
    recentMessages.unshift(message);
    currentTokenCount += tokenEstimate;
    i--;
  }

  // 步骤5: 如果最新用户问题尚未添加（因为不是最后一条消息），确保添加它
  if (
    userLastQuestion &&
    !recentMessages.some((msg) => msg.id === userLastQuestion?.id)
  ) {
    recentMessages.push(userLastQuestion);
  }

  // 步骤6: 如果有足够空间，添加一条摘要消息说明省略了多少早期消息
  if (i >= 0 && currentTokenCount < maxTokens - 200) {
    const skippedCount = i + 1;
    if (skippedCount > 0) {
      const summaryMessage: Message = {
        id: 'history-summary',
        role: 'system',
        content: `[系统提示: 这里省略了 ${skippedCount} 条较早的对话消息，下面是最近的对话内容]`,
      };
      recentMessages.unshift(summaryMessage);
    }
  }

  // 步骤7: 合并系统消息和优化后的最近消息
  return [...systemMessages, ...recentMessages];
}
