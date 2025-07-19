'use client';

import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';

/**
 * 将HTML元素转换为图片并下载
 * @param element HTML元素
 * @param filename 文件名
 * @param options 转换选项
 */
export async function downloadImageFromHTML(
  element: HTMLElement,
  filename: string = 'marathon-schedule.png',
  options: {
    scale?: number;
    width?: number;
    height?: number;
    backgroundColor?: string;
  } = {},
): Promise<void> {
  try {
    console.log('开始生成图片...');

    const canvas = await html2canvas(element, {
      scale: options.scale || 2, // 高分辨率
      backgroundColor: options.backgroundColor || '#ffffff',
      useCORS: true,
      allowTaint: true,
      width: options.width,
      height: options.height,
      scrollX: 0,
      scrollY: 0,
      // 优化渲染质量
      imageTimeout: 15000,
      removeContainer: true,
    });

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            console.log('图片生成成功，开始下载');
            saveAs(blob, filename);
            resolve();
          } else {
            reject(new Error('无法生成图片blob'));
          }
        },
        'image/png',
        1.0,
      );
    });
  } catch (error) {
    console.error('下载图片失败:', error);
    throw error;
  }
}

/**
 * 将HTML元素转换为图片并复制到剪贴板
 * @param element HTML元素
 * @param options 转换选项
 */
export async function copyImageFromHTML(
  element: HTMLElement,
  options: {
    scale?: number;
    width?: number;
    height?: number;
    backgroundColor?: string;
  } = {},
): Promise<void> {
  try {
    console.log('开始复制图片到剪贴板...');

    // 检查浏览器是否支持剪贴板API
    if (!navigator.clipboard) {
      throw new Error('浏览器不支持剪贴板功能');
    }

    const canvas = await html2canvas(element, {
      scale: options.scale || 2,
      backgroundColor: options.backgroundColor || '#ffffff',
      useCORS: true,
      allowTaint: true,
      width: options.width,
      height: options.height,
      scrollX: 0,
      scrollY: 0,
      imageTimeout: 15000,
      removeContainer: true,
    });

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        async (blob) => {
          if (blob) {
            try {
              const clipboardItem = new ClipboardItem({
                'image/png': blob,
              });
              await navigator.clipboard.write([clipboardItem]);
              console.log('图片复制到剪贴板成功');
              resolve();
            } catch (clipboardError) {
              console.error('写入剪贴板失败:', clipboardError);
              reject(new Error('写入剪贴板失败'));
            }
          } else {
            reject(new Error('无法生成图片blob'));
          }
        },
        'image/png',
        1.0,
      );
    });
  } catch (error) {
    console.error('复制图片失败:', error);
    throw error;
  }
}

/**
 * 检查浏览器是否支持剪贴板功能
 */
export function isClipboardSupported(): boolean {
  return !!(navigator.clipboard && navigator.clipboard.write);
}

/**
 * 获取元素的最佳渲染尺寸
 * @param element HTML元素
 * @param maxWidth 最大宽度
 */
export function getOptimalDimensions(
  element: HTMLElement,
  maxWidth: number = 1200,
): { width: number; height: number } {
  const rect = element.getBoundingClientRect();
  const scale = Math.min(1, maxWidth / rect.width);

  return {
    width: Math.floor(rect.width * scale),
    height: Math.floor(rect.height * scale),
  };
}
