import imageCompression from 'browser-image-compression';
import {
  COMPRESSION_OPTIONS,
  IMAGE_SIZE_LIMITS,
  SUPPORTED_IMAGE_TYPES,
  ERROR_MESSAGES,
} from '@/consts/imageConfig';

/**
 * 图片压缩选项接口
 */
export interface ImageCompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
  initialQuality?: number;
  preserveExif?: boolean;
  onProgress?: (progress: number) => void;
}

/**
 * 压缩结果接口
 */
export interface CompressionResult {
  success: boolean;
  file?: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  error?: string;
}

/**
 * 验证图片文件
 */
export const validateImageFile = ({
  file,
}: {
  file: File;
}): { isValid: boolean; error?: string } => {
  // 检查文件类型
  if (!SUPPORTED_IMAGE_TYPES.includes(file.type as any)) {
    return {
      isValid: false,
      error: ERROR_MESSAGES.UNSUPPORTED_FORMAT,
    };
  }

  // 检查文件大小
  if (file.size > IMAGE_SIZE_LIMITS.MAX_ORIGINAL_SIZE) {
    return {
      isValid: false,
      error: ERROR_MESSAGES.FILE_TOO_LARGE,
    };
  }

  return { isValid: true };
};

/**
 * 压缩图片文件
 */
export const compressImage = async ({
  file,
  options = {},
}: {
  file: File;
  options?: ImageCompressionOptions;
}): Promise<CompressionResult> => {
  const originalSize = file.size;

  try {
    // 验证文件
    const validation = validateImageFile({ file });
    if (!validation.isValid) {
      return {
        success: false,
        originalSize,
        compressedSize: 0,
        compressionRatio: 0,
        error: validation.error,
      };
    }

    // 合并压缩选项
    const compressionOptions = {
      ...COMPRESSION_OPTIONS,
      ...options,
    };

    // 执行压缩
    const compressedFile = await imageCompression(file, compressionOptions);
    const compressedSize = compressedFile.size;
    const compressionRatio = Math.round(
      (1 - compressedSize / originalSize) * 100
    );

    return {
      success: true,
      file: compressedFile,
      originalSize,
      compressedSize,
      compressionRatio,
    };
  } catch (error) {
    console.error('图片压缩失败:', error);
    return {
      success: false,
      originalSize,
      compressedSize: 0,
      compressionRatio: 0,
      error: ERROR_MESSAGES.COMPRESSION_FAILED,
    };
  }
};

/**
 * 获取文件大小的可读字符串
 */
export const getReadableFileSize = ({ size }: { size: number }): string => {
  if (size < 1024) {
    return `${size} B`;
  } else if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(2)} KB`;
  } else {
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  }
};
