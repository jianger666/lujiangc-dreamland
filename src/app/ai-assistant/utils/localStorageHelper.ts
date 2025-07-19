import store from 'store';
import { Conversation } from '@/types/ai-assistant';

const INTERRUPTED_CONVERSATIONS_KEY = 'ai-assistant-interrupted-conversations';

/**
 * 将对话列表保存到 LocalStorage
 * @param conversations 对话列表
 */
export function saveConversationsToLocalStorage(
  conversations: Conversation[]
): void {
  try {
    store.set(INTERRUPTED_CONVERSATIONS_KEY, conversations);
  } catch (error) {
    console.error('保存中断对话到LocalStorage失败:', error);
  }
}

/**
 * 从 LocalStorage 加载对话列表
 * @returns 对话列表或 null（如果不存在或解析失败）
 */
export function loadConversationsFromLocalStorage(): Conversation[] | null {
  try {
    const storedData = store.get(INTERRUPTED_CONVERSATIONS_KEY);
    return storedData === undefined ? null : storedData;
  } catch (error) {
    console.error('从LocalStorage加载中断对话失败:', error);
    return null;
  }
}

/**
 * 从 LocalStorage 清理中断对话数据
 */
export function clearConversationsFromLocalStorage(): void {
  try {
    store.remove(INTERRUPTED_CONVERSATIONS_KEY);
  } catch (error) {
    console.error('清理LocalStorage中断对话失败:', error);
  }
}
