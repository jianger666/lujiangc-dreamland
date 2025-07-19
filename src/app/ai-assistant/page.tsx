/**
 * AI 助手页面
 *
 * 提供类似 ChatGPT 的交互式 AI 对话界面
 * - 创建、切换、删除对话
 * - 支持多种 AI 模型选择
 * - 实时流式响应
 * - 自动生成对话标题
 */

import { AIAssistantProvider } from './providers';
import { getAllModels } from '@/app/api/ai-assistant/_config';
import { ClientContent } from './components/ClientContent';

export default async function AIAssistantPage() {
  // 在服务端获取可用模型列表
  const availableModels = getAllModels();

  return (
    <AIAssistantProvider availableModels={availableModels}>
      <ClientContent />
    </AIAssistantProvider>
  );
}
