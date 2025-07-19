/**
 * 图片处理相关配置常量
 */

// 支持的图片格式
export const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;

// 图片文件大小限制
export const IMAGE_SIZE_LIMITS = {
  // 原始文件最大大小 (5MB)
  MAX_ORIGINAL_SIZE: 5 * 1024 * 1024,
  // 压缩后目标大小 (2MB)
  MAX_COMPRESSED_SIZE: 2 * 1024 * 1024,
} as const;

// 图片压缩配置
export const COMPRESSION_OPTIONS = {
  // 最大文件大小 (MB)
  maxSizeMB: 2,
  // 最大宽高
  maxWidthOrHeight: 1920,
  // 使用Web Worker
  useWebWorker: true,
  // 初始质量
  initialQuality: 0.8,
  // 保留EXIF信息
  preserveExif: false,
  // 最大迭代次数
  maxIteration: 10,
} as const;

// 图片预览配置
export const PREVIEW_CONFIG = {
  // 预览图片尺寸
  width: 80,
  height: 80,
} as const;

// 错误消息
export const ERROR_MESSAGES = {
  FILE_TOO_LARGE: "图片大小不能超过5MB",
  UNSUPPORTED_FORMAT: "不支持的图片格式",
  COMPRESSION_FAILED: "图片压缩失败，请重试",
  PROCESSING_ERROR: "处理图片时发生错误",
} as const;
