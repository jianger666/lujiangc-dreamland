import { openDB, DBSchema, IDBPDatabase } from 'idb';

/**
 * 通用 IndexedDB 辅助函数
 * 提供基础的数据库操作功能
 */

/**
 * 打开一个 IndexedDB 数据库连接
 * @param name 数据库名称
 * @param version 数据库版本
 * @param upgradeCallback 数据库升级回调函数
 * @returns 数据库连接
 */
export async function openDatabase<T extends DBSchema>(
  name: string,
  version: number,
  upgradeCallback: (db: IDBPDatabase<T>) => void,
): Promise<IDBPDatabase<T>> {
  return openDB<T>(name, version, {
    upgrade(db) {
      upgradeCallback(db);
    },
  });
}

/**
 * 创建数据库单例，避免重复打开连接
 * @param name 数据库名称
 * @param version 数据库版本
 * @param upgradeCallback 数据库升级回调函数
 * @returns 数据库连接获取函数
 */
export function createDBInstance<T extends DBSchema>(
  name: string,
  version: number,
  upgradeCallback: (db: IDBPDatabase<T>) => void,
) {
  let dbPromise: Promise<IDBPDatabase<T>> | null = null;

  return function getDB(): Promise<IDBPDatabase<T>> {
    if (!dbPromise) {
      dbPromise = openDatabase<T>(name, version, upgradeCallback);
    }
    return dbPromise;
  };
}
