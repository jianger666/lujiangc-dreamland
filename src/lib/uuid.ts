import { v4 as uuidv4 } from "uuid";

/**
 * 生成一个唯一的 UUID
 * @returns 唯一的字符串标识符
 */
export function generateUUID(): string {
  return uuidv4();
}
