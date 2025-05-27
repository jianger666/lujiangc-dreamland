export * from './conversation';
export * from './db';
export * from './localStorageHelper';
export * from './streamService';
export * from './imageCompression';

/**
 * 将File对象转换为base64字符串
 * @param file 要转换的文件
 * @returns Promise<string> base64字符串
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};
/**
 * 获取文件大小的可读字符串
 * @param size 文件大小（字节）
 * @returns string 格式化后的大小字符串
 */
export const formatFileSize = (size: number): string => {
  if (size < 1024) {
    return `${size} B`;
  } else if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(2)} KB`;
  } else {
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  }
};
