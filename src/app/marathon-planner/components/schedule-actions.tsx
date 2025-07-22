'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DownloadIcon,
  CopyIcon,
  RefreshCwIcon,
  CheckIcon,
  AlertCircleIcon,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  downloadImageFromElement,
  copyImageFromElement,
  downloadScheduleImage,
  copyScheduleImage,
  isClipboardSupported,
  getMd2PosterInfo,
} from '@/lib/utils/markdown-to-image';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { MarathonPlanFormData } from '../types';

interface ScheduleActionsProps {
  onRegenerate: () => void;
  getContentElement: () => HTMLDivElement | null;
  formData: MarathonPlanFormData;
  isRegenerating?: boolean;
  // 新增：课表内容，用于独立生成
  schedule?: string;
}

export function ScheduleActions({
  onRegenerate,
  getContentElement,
  formData,
  isRegenerating = false,
  schedule,
}: ScheduleActionsProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const isMobile = !useBreakpoint('md'); // 移动端判断
  const { toast } = useToast();

  // 使用独立生成方式（推荐）还是传统DOM方式
  const useIndependentGeneration = true;

  const handleDownload = async () => {
    if (useIndependentGeneration && schedule) {
      // 使用独立生成方式，确保移动端和PC端一致性
      setIsDownloading(true);
      setDownloadSuccess(false);

      try {
        const filename = `${formData.raceName || '马拉松训练计划'}-${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.png`;
        
        await downloadScheduleImage({
          schedule,
          raceName: formData.raceName,
          filename,
          width: 1024,
          height: 1280,
        });

        setDownloadSuccess(true);
        toast({
          title: '✅ 下载成功！',
          description: '训练计划图片已保存到您的设备',
          variant: 'default',
        });

        setTimeout(() => setDownloadSuccess(false), 3000);
      } catch (error) {
        console.error('下载失败:', error);
        toast({
          title: '❌ 下载失败',
          description: isMobile
            ? '请检查设备存储空间是否充足，或稍后重试'
            : '下载失败，请稍后重试',
          variant: 'destructive',
        });
      } finally {
        setIsDownloading(false);
      }
    } else {
      // 使用传统DOM方式（兼容性备选方案）
      const element = getContentElement();
      if (!element) {
        console.error('无法获取内容元素');
        toast({
          title: '获取失败',
          description: '无法获取训练计划内容，请稍后重试',
          variant: 'destructive',
        });
        return;
      }

      // 检查元素是否可见
      const elementInfo = getMd2PosterInfo(element);
      if (!elementInfo.hasCanvas) {
        toast({
          title: '请稍等',
          description: '训练计划正在加载中，请稍等片刻后重试',
          variant: 'default',
        });
        return;
      }

      setIsDownloading(true);
      setDownloadSuccess(false);

      try {
        const filename = `${formData.raceName || '马拉松训练计划'}-${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.png`;

        await downloadImageFromElement(element, filename);

        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 3000);
      } catch (error) {
        console.error('下载失败:', error);
        toast({
          title: '❌ 下载失败',
          description: isMobile
            ? '请确保训练计划已完全加载，检查设备存储空间是否充足。如问题持续，请使用电脑端下载。'
            : '下载失败，请确保训练计划已完全加载后重试',
          variant: 'destructive',
        });
      } finally {
        setIsDownloading(false);
      }
    }
  };

  const handleCopy = async () => {
    if (!isClipboardSupported()) {
      toast({
        title: '不支持复制',
        description: '您的浏览器不支持复制图片功能，请使用下载功能',
        variant: 'destructive',
      });
      return;
    }

    if (useIndependentGeneration && schedule) {
      // 使用独立生成方式
      setIsCopying(true);
      setCopySuccess(false);

      try {
        await copyScheduleImage({
          schedule,
          raceName: formData.raceName,
          width: 1024,
          height: 1280,
        });

        setCopySuccess(true);
        toast({
          title: '✅ 复制成功！',
          description: '训练计划图片已复制到剪贴板',
          variant: 'default',
        });
        setTimeout(() => setCopySuccess(false), 3000);
      } catch (error) {
        console.error('复制失败:', error);
        toast({
          title: '复制失败',
          description: '复制失败，请稍后重试',
          variant: 'destructive',
        });
      } finally {
        setIsCopying(false);
      }
    } else {
      // 使用传统DOM方式
      const element = getContentElement();
      if (!element) {
        console.error('无法获取内容元素');
        toast({
          title: '获取失败',
          description: '无法获取训练计划内容，请稍后重试',
          variant: 'destructive',
        });
        return;
      }

      // 检查元素是否可见
      const elementInfo = getMd2PosterInfo(element);
      if (!elementInfo.hasCanvas) {
        toast({
          title: '请稍等',
          description: '训练计划正在加载中，请稍等片刻后重试',
          variant: 'default',
        });
        return;
      }

      setIsCopying(true);
      setCopySuccess(false);

      try {
        await copyImageFromElement(element);

        setCopySuccess(true);
        toast({
          title: '✅ 复制成功！',
          description: '训练计划图片已复制到剪贴板',
          variant: 'default',
        });
        setTimeout(() => setCopySuccess(false), 3000);
      } catch (error) {
        console.error('复制失败:', error);
        toast({
          title: '复制失败',
          description: '复制失败，请确保训练计划已完全加载后重试',
          variant: 'destructive',
        });
      } finally {
        setIsCopying(false);
      }
    }
  };

  const handleRegenerate = () => {
    setCopySuccess(false);
    setDownloadSuccess(false);
    onRegenerate();
  };



  // 下载按钮的内容和图标
  const getDownloadButtonContent = () => {
    if (downloadSuccess) {
      return (
        <>
          <CheckIcon className="mr-2 h-4 w-4 text-green-600" />
          下载成功
        </>
      );
    }

    if (isDownloading) {
      return (
        <>
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
          下载中...
        </>
      );
    }

    return (
      <>
        <DownloadIcon className="mr-2 h-4 w-4" />
        下载图片
      </>
    );
  };

  // 复制按钮的内容和图标
  const getCopyButtonContent = () => {
    if (!isClipboardSupported()) {
      return (
        <>
          <AlertCircleIcon className="mr-2 h-4 w-4" />
          不支持
        </>
      );
    }

    if (copySuccess) {
      return (
        <>
          <CheckIcon className="mr-2 h-4 w-4 text-green-600" />
          复制成功
        </>
      );
    }

    if (isCopying) {
      return (
        <>
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
          复制中...
        </>
      );
    }

    return (
      <>
        <CopyIcon className="mr-2 h-4 w-4" />
        复制图片
      </>
    );
  };

  return (
    <div className="flex flex-wrap justify-center gap-3 sm:justify-start">
      {/* 重新生成按钮 */}
      <Button
        onClick={handleRegenerate}
        disabled={isRegenerating}
        variant="default"
        size="default"
        className="min-w-[120px]"
      >
        <RefreshCwIcon
          className={`mr-2 h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`}
        />
        {isRegenerating ? '生成中...' : '重新生成'}
      </Button>

      {/* 下载图片按钮 */}
      <Button
        onClick={handleDownload}
        disabled={isDownloading || isRegenerating}
        variant="outline"
        size="default"
        className="min-w-[120px]"
      >
        {getDownloadButtonContent()}
      </Button>

      {/* 复制图片按钮 - 移动端隐藏 */}
      {!isMobile && (
        <Button
          onClick={handleCopy}
          disabled={isCopying || isRegenerating || !isClipboardSupported()}
          variant="outline"
          size="default"
          className="min-w-[120px]"
        >
          {getCopyButtonContent()}
        </Button>
      )}
    </div>
  );
}
