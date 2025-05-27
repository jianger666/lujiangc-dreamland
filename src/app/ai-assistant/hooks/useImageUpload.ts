import { useState, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { compressImage } from '../utils/imageCompression';
import type { ImageCompressionOptions } from '../utils/imageCompression';

/**
 * useImageUpload hook的返回类型
 */
export interface UseImageUploadReturn {
  imagePreview: string | null;
  isProcessingImage: boolean;
  compressionInfo: {
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
  } | null;
  handleImageUpload: (file: File | null) => Promise<void>;
  handleUploadButtonClick: () => void;
  handleRemoveImage: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  resetFileInput: () => void;
}

/**
 * useImageUpload hook的配置选项
 */
export interface UseImageUploadOptions {
  compressionOptions?: ImageCompressionOptions;
  onCompressionComplete?: (result: {
    success: boolean;
    file?: File;
    error?: string;
  }) => void;
}

/**
 * 图片上传和压缩hook
 */
export const useImageUpload = ({
  compressionOptions,
  onCompressionComplete,
}: UseImageUploadOptions = {}): UseImageUploadReturn => {
  const { toast } = useToast();

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState<{
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * 重置文件输入框
   */
  const resetFileInput = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  /**
   * 处理图片上传
   */
  const handleImageUpload = useCallback(
    async (file: File | null) => {
      if (!file) {
        setImagePreview(null);
        setCompressionInfo(null);
        return;
      }

      try {
        setIsProcessingImage(true);

        // 压缩图片
        const result = await compressImage({
          file,
          options: {
            ...compressionOptions,
            onProgress: (progress) => {
              // 可以在这里添加进度显示逻辑
              console.log(`压缩进度: ${progress}%`);
            },
          },
        });

        if (result.success && result.file) {
          // 创建预览URL
          const previewUrl = URL.createObjectURL(result.file);
          setImagePreview(previewUrl);

          // 设置压缩信息
          setCompressionInfo({
            originalSize: result.originalSize,
            compressedSize: result.compressedSize,
            compressionRatio: result.compressionRatio,
          });

          // 压缩成功，不显示toast提示

          // 回调通知压缩完成
          onCompressionComplete?.({ success: true, file: result.file });
        } else {
          // 压缩失败
          setImagePreview(null);
          setCompressionInfo(null);

          toast({
            variant: 'destructive',
            title: '图片处理失败',
            description: result.error || '未知错误',
          });

          onCompressionComplete?.({ success: false, error: result.error });
        }
      } catch (error) {
        console.error('处理图片错误:', error);

        setImagePreview(null);
        setCompressionInfo(null);

        toast({
          variant: 'destructive',
          title: '处理图片出错',
          description: '处理图片出错，请重试',
        });

        onCompressionComplete?.({ success: false, error: '处理图片出错' });
      } finally {
        setIsProcessingImage(false);
        resetFileInput();
      }
    },
    [compressionOptions, onCompressionComplete, toast, resetFileInput],
  );

  /**
   * 点击上传按钮
   */
  const handleUploadButtonClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  /**
   * 移除图片
   */
  const handleRemoveImage = useCallback(() => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    setCompressionInfo(null);
    resetFileInput();
  }, [imagePreview, resetFileInput]);

  return {
    imagePreview,
    isProcessingImage,
    compressionInfo,
    handleImageUpload,
    handleUploadButtonClick,
    handleRemoveImage,
    fileInputRef,
    resetFileInput,
  };
};
