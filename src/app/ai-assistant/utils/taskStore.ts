/**
 * 长时间运行任务存储工具
 *
 * 用于处理超过Vercel函数执行时间限制的AI生成任务，
 * 通过在localStorage中存储任务状态和部分结果，允许即使在服务器超时的情况下也能继续处理。
 */

import { generateUUID } from '@/lib/uuid';
import { Message } from '../types';

export interface LongRunningTask {
  id: string;
  createdAt: string;
  completedAt?: string;
  conversationId: string;
  modelId: string;
  messages: Message[];
  content: string;
  thinking: string;
  isComplete: boolean;
  isError: boolean;
  errorMessage?: string;
}

// 任务存储前缀
const TASK_PREFIX = 'ai_task_';

/**
 * 创建新任务
 */
export function createTask(
  conversationId: string,
  modelId: string,
  messages: Message[],
): LongRunningTask {
  const taskId = generateUUID();
  const task: LongRunningTask = {
    id: taskId,
    createdAt: new Date().toISOString(),
    conversationId,
    modelId,
    messages,
    content: '',
    thinking: '',
    isComplete: false,
    isError: false,
  };

  saveTask(task);
  return task;
}

/**
 * 保存任务
 */
export function saveTask(task: LongRunningTask): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`${TASK_PREFIX}${task.id}`, JSON.stringify(task));
  }
}

/**
 * 获取任务
 */
export function getTask(taskId: string): LongRunningTask | null {
  if (typeof window !== 'undefined') {
    const taskJson = localStorage.getItem(`${TASK_PREFIX}${taskId}`);
    if (taskJson) {
      return JSON.parse(taskJson);
    }
  }
  return null;
}

/**
 * 更新任务内容
 */
export function updateTaskContent(
  taskId: string,
  content: string,
): LongRunningTask | null {
  const task = getTask(taskId);
  if (task) {
    task.content = content;
    saveTask(task);
    return task;
  }
  return null;
}

/**
 * 更新任务思考内容
 */
export function updateTaskThinking(
  taskId: string,
  thinking: string,
): LongRunningTask | null {
  const task = getTask(taskId);
  if (task) {
    task.thinking = thinking;
    saveTask(task);
    return task;
  }
  return null;
}

/**
 * 完成任务
 */
export function completeTask(
  taskId: string,
  content: string,
  thinking?: string,
): LongRunningTask | null {
  const task = getTask(taskId);
  if (task) {
    task.content = content;
    if (thinking) task.thinking = thinking;
    task.isComplete = true;
    task.completedAt = new Date().toISOString();
    saveTask(task);
    return task;
  }
  return null;
}

/**
 * 标记任务错误
 */
export function markTaskError(
  taskId: string,
  errorMessage: string,
): LongRunningTask | null {
  const task = getTask(taskId);
  if (task) {
    task.isError = true;
    task.errorMessage = errorMessage;
    task.completedAt = new Date().toISOString();
    saveTask(task);
    return task;
  }
  return null;
}

/**
 * 获取指定对话的所有任务
 */
export function getTasksByConversation(
  conversationId: string,
): LongRunningTask[] {
  if (typeof window !== 'undefined') {
    const tasks: LongRunningTask[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(TASK_PREFIX)) {
        const taskJson = localStorage.getItem(key);
        if (taskJson) {
          const task = JSON.parse(taskJson) as LongRunningTask;
          if (task.conversationId === conversationId) {
            tasks.push(task);
          }
        }
      }
    }
    return tasks.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }
  return [];
}

/**
 * 清理完成的任务
 */
export function cleanupCompletedTasks(olderThanHours = 24): void {
  if (typeof window !== 'undefined') {
    const now = new Date().getTime();
    const cutoff = now - olderThanHours * 60 * 60 * 1000;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(TASK_PREFIX)) {
        const taskJson = localStorage.getItem(key);
        if (taskJson) {
          const task = JSON.parse(taskJson) as LongRunningTask;
          if (task.completedAt) {
            const completedAt = new Date(task.completedAt).getTime();
            if (completedAt < cutoff) {
              localStorage.removeItem(key);
            }
          }
        }
      }
    }
  }
}
