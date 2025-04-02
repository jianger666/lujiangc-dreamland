import { useContext } from 'react';
import { AIAssistantContext } from '../providers';

// 自定义Hook，用于在组件中访问上下文
export function useAIAssistant() {
  const context = useContext(AIAssistantContext);

  if (!context) {
    throw new Error('useAIAssistant 必须在 AIAssistantProvider 内部使用');
  }

  return context;
}
