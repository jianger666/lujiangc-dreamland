import { useState, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { compressImage } from "../utils/imageCompression";
import type { ImageCompressionOptions } from "../utils/imageCompression";

// 定义单个图片的压缩信息
export interface ImageCompressionInfo {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

// 定义图片项
export interface ImageItem {
  id: string;
  preview: string;
  file: File;
  compressionInfo: ImageCompressionInfo;
}

/**
 * useImageUpload hook的返回类型
 */
export interface UseImageUploadReturn {
  images: ImageItem[];
  isProcessingImage: boolean;
  handleImageUpload: (file: File | null) => Promise<void>;
  handleUploadButtonClick: () => void;
  handleRemoveImage: (imageId: string) => void;
  handleRemoveAllImages: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  resetFileInput: () => void;
  canAddMoreImages: boolean;
  maxImages: number;
}

/**
 * useImageUpload hook的配置选项
 */
export interface UseImageUploadOptions {
  compressionOptions?: ImageCompressionOptions;
  maxImages?: number;
  onCompressionComplete?: (result: {
    success: boolean;
    files?: File[];
    error?: string;
  }) => void;
}

/**
 * 图片上传和压缩hook
 */
export const useImageUpload = ({
  compressionOptions,
  maxImages = 9,
  onCompressionComplete,
}: UseImageUploadOptions = {}): UseImageUploadReturn => {
  const { toast } = useToast();

  const [images, setImages] = useState<ImageItem[]>([]);
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 计算是否可以添加更多图片
  const canAddMoreImages = images.length < maxImages;

  /**
   * 生成唯一ID
   */
  const generateId = () =>
    `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  /**
   * 重置文件输入框
   */
  const resetFileInput = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  /**
   * 处理图片上传
   */
  const handleImageUpload = useCallback(
    async (file: File | null) => {
      if (!file) {
        return;
      }

      // 检查是否已达到最大图片数量
      if (images.length >= maxImages) {
        toast({
          variant: "destructive",
          title: "图片数量已达上限",
          description: `最多只能上传 ${maxImages} 张图片`,
        });
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

          // 创建新的图片项
          const newImageItem: ImageItem = {
            id: generateId(),
            preview: previewUrl,
            file: result.file,
            compressionInfo: {
              originalSize: result.originalSize,
              compressedSize: result.compressedSize,
              compressionRatio: result.compressionRatio,
            },
          };

          // 添加到图片列表
          setImages((prev) => [...prev, newImageItem]);

          // 回调通知压缩完成
          onCompressionComplete?.({
            success: true,
            files: [...images.map((img) => img.file), result.file],
          });
        } else {
          // 压缩失败
          toast({
            variant: "destructive",
            title: "图片处理失败",
            description: result.error || "未知错误",
          });

          onCompressionComplete?.({ success: false, error: result.error });
        }
      } catch (error) {
        console.error("处理图片错误:", error);

        toast({
          variant: "destructive",
          title: "处理图片出错",
          description: "处理图片出错，请重试",
        });

        onCompressionComplete?.({ success: false, error: "处理图片出错" });
      } finally {
        setIsProcessingImage(false);
        resetFileInput();
      }
    },
    [
      images,
      maxImages,
      compressionOptions,
      onCompressionComplete,
      toast,
      resetFileInput,
    ],
  );

  /**
   * 点击上传按钮
   */
  const handleUploadButtonClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  /**
   * 移除单张图片
   */
  const handleRemoveImage = useCallback(
    (imageId: string) => {
      setImages((prev) => {
        const imageToRemove = prev.find((img) => img.id === imageId);
        if (imageToRemove) {
          URL.revokeObjectURL(imageToRemove.preview);
        }
        const newImages = prev.filter((img) => img.id !== imageId);

        // 通知剩余文件
        onCompressionComplete?.({
          success: true,
          files: newImages.map((img) => img.file),
        });

        return newImages;
      });
      resetFileInput();
    },
    [onCompressionComplete, resetFileInput],
  );

  /**
   * 移除所有图片
   */
  const handleRemoveAllImages = useCallback(() => {
    images.forEach((img) => {
      URL.revokeObjectURL(img.preview);
    });
    setImages([]);
    onCompressionComplete?.({ success: true, files: [] });
    resetFileInput();
  }, [images, onCompressionComplete, resetFileInput]);

  return {
    images,
    isProcessingImage,
    handleImageUpload,
    handleUploadButtonClick,
    handleRemoveImage,
    handleRemoveAllImages,
    fileInputRef,
    resetFileInput,
    canAddMoreImages,
    maxImages,
  };
};
