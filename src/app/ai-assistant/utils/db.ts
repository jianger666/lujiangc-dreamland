import { DBSchema, IDBPDatabase } from "idb";
import { createDBInstance } from "@/lib";
import type { Conversation } from "@/types/ai-assistant";

// 定义AI助手数据库Schema
interface AIAssistantDB extends DBSchema {
  conversations: {
    key: string;
    value: Conversation;
    indexes: {
      "by-updated": string;
    };
  };
  activeConversation: {
    key: "activeId";
    value: string;
  };
}

const DB_NAME = "ai-assistant-db";
const DB_VERSION = 1;

// 初始化数据库
const getDB = createDBInstance<AIAssistantDB>(
  DB_NAME,
  DB_VERSION,
  (db: IDBPDatabase<AIAssistantDB>) => {
    // 创建对话存储
    const conversationStore = db.createObjectStore("conversations", {
      keyPath: "id",
    });
    conversationStore.createIndex("by-updated", "updatedAt");

    // 创建活跃对话ID存储
    db.createObjectStore("activeConversation");
  },
);

/**
 * 获取所有对话
 */
export async function getAllConversations(): Promise<Conversation[]> {
  const db = await getDB();
  return db.getAllFromIndex("conversations", "by-updated");
}

/**
 * 获取活跃对话ID
 */
export async function getActiveConversationId(): Promise<string> {
  const db = await getDB();
  try {
    const activeId = await db.get("activeConversation", "activeId");
    return activeId || "";
  } catch (error) {
    console.error("获取活跃对话ID失败:", error);
    return "";
  }
}

/**
 * 保存对话列表
 */
export async function saveConversations(
  conversations: Conversation[],
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("conversations", "readwrite");

  // 清空当前存储
  await tx.objectStore("conversations").clear();

  // 添加新的对话
  for (const conversation of conversations) {
    await tx.objectStore("conversations").add(conversation);
  }

  await tx.done;
}

/**
 * 保存单个对话
 */
export async function saveConversation(
  conversation: Conversation,
): Promise<void> {
  const db = await getDB();
  await db.put("conversations", conversation);
}

/**
 * 删除对话
 */
export async function deleteConversation(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("conversations", id);
}

/**
 * 保存活跃对话ID
 */
export async function saveActiveConversationId(id: string): Promise<void> {
  const db = await getDB();
  await db.put("activeConversation", id, "activeId");
}
