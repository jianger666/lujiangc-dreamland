'use client';

import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import React from 'react';
import { createRoot } from 'react-dom/client';

/**
 * 增强版 html2canvas 配置选项，提高兼容性
 */
const getEnhancedHtml2CanvasOptions = (element: HTMLElement) => {
  const isRetina = window.devicePixelRatio > 1;
  const scale = Math.min(window.devicePixelRatio || 1, 2); // 限制最大缩放比例

  return {
    // 允许跨域图片
    allowTaint: true, // 改为true，避免跨域问题
    
    // 使用 CORS 获取图片
    useCORS: true,
    
    // 使用适当的像素比例，但限制最大值防止内存溢出
    scale,
    
    // 背景颜色
    backgroundColor: '#ffffff', // 设置白色背景，不要透明
    
    // 提高渲染质量
    logging: false, // 关闭详细日志
    
    // 元素尺寸 - 使用scrollWidth/Height确保捕获完整内容
    width: Math.max(element.offsetWidth, element.scrollWidth),
    height: Math.max(element.offsetHeight, element.scrollHeight),
    
    // 优化渲染选项
    foreignObjectRendering: false,
    letterRendering: true,
    
    // 图像渲染优化
    imageTimeout: 15000, // 15秒超时
    
    // 简化滚动处理
    scrollX: 0,
    scrollY: 0,
    
         // 简化ignoreElements逻辑
     ignoreElements: (element: Element) => {
       const tagName = element.tagName?.toLowerCase();
       return tagName === 'script' || tagName === 'style' || tagName === 'noscript';
     },
    
        // 简化onclone处理
    onclone: (clonedDoc: Document, element: HTMLElement) => {
      return clonedDoc;
    },
  };
};

/**
 * 等待元素完全渲染，增强版
 */
async function waitForElementReady(
  element: HTMLElement,
  timeout = 5000
): Promise<void> {
  return new Promise((resolve) => {
    let resolved = false;
    
    const finish = () => {
      if (!resolved) {
        resolved = true;
        resolve();
      }
    };

    // 检查图片加载状态
    const images = element.querySelectorAll('img');
    let loadedImages = 0;
    const totalImages = images.length;

    if (totalImages === 0) {
      // 没有图片，检查字体加载
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
          setTimeout(finish, 300); // 额外等待渲染完成
        }).catch(finish);
      } else {
        setTimeout(finish, 500);
      }
      return;
    }

    // 处理图片加载
    const checkImageLoaded = () => {
      loadedImages++;
      if (loadedImages >= totalImages) {
        // 所有图片加载完成，等待字体
        if (document.fonts && document.fonts.ready) {
          document.fonts.ready.then(() => {
            setTimeout(finish, 300);
          }).catch(finish);
        } else {
          setTimeout(finish, 500);
        }
      }
    };

    images.forEach((img) => {
      if (img.complete && img.naturalHeight !== 0) {
        checkImageLoaded();
      } else {
        img.onload = checkImageLoaded;
        img.onerror = checkImageLoaded; // 即使失败也继续
      }
    });

    // 设置超时
    setTimeout(finish, timeout);
  });
}

/**
 * 增强版 HTML 元素转 Canvas
 */
async function enhancedHtmlToCanvas(element: HTMLElement): Promise<HTMLCanvasElement> {
  try {
    console.log('开始将 HTML 元素转换为 Canvas...');

    // 等待元素完全渲染
    await waitForElementReady(element);

    // 强制重新计算布局
    void element.offsetHeight;
    
    const options = getEnhancedHtml2CanvasOptions(element);
    console.log('html2canvas 配置:', options);

    const canvas = await html2canvas(element, options);

    console.log(`Canvas 生成成功，尺寸: ${canvas.width}x${canvas.height}`);
    return canvas;
  } catch (error) {
    console.error('html2canvas 转换失败:', error);
    throw new Error(
      `转换为图片失败: ${error instanceof Error ? error.message : '未知错误'}`
    );
  }
}

/**
 * 创建独立的课表图片生成器
 */
export async function generateScheduleImage({
  schedule,
  raceName,
  width = 1024,
  height = 1280,
}: {
  schedule: string;
  raceName?: string;
  width?: number;
  height?: number;
}): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    // 创建临时容器，让html2canvas能够正确捕获内容
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute'; // 改回absolute，fixed可能有问题
    tempContainer.style.top = '-10000px'; // 移出可视区域但不影响渲染
    tempContainer.style.left = '-10000px';
    tempContainer.style.width = `${width}px`;
    tempContainer.style.height = 'auto'; // 让高度自适应
    tempContainer.style.zIndex = '-9999';
    // 关键修改：不设置opacity和visibility，这些会影响html2canvas捕获
    // tempContainer.style.opacity = '0'; 
    // tempContainer.style.visibility = 'hidden';
    tempContainer.style.pointerEvents = 'none';
    tempContainer.style.overflow = 'visible';
    
    // 防止影响页面滚动的关键设置
    const originalBodyOverflow = document.body.style.overflow;
    const originalDocumentOverflow = document.documentElement.style.overflow;
    
    // 临时添加到body
    document.body.appendChild(tempContainer);

    // 动态导入课表生成器组件
    import('@/app/marathon-planner/components/schedule-image-generator').then(
      ({ ScheduleImageGenerator }) => {
        // 创建 React 元素
        const element = React.createElement(ScheduleImageGenerator, {
          schedule,
          raceName,
          width,
          height,
        });

        // 渲染到临时容器
        const root = createRoot(tempContainer);
        root.render(element);

        // 等待渲染完成 - 增加等待时间确保完全渲染
        setTimeout(async () => {
          try {
            const generatedElement = tempContainer.firstElementChild as HTMLElement;
            if (!generatedElement) {
              throw new Error('无法生成课表元素');
            }



            // 强制刷新布局并获取实际尺寸
            void generatedElement.offsetHeight;
            
            // 获取元素的实际渲染尺寸
            const actualHeight = generatedElement.scrollHeight;
            const actualWidth = generatedElement.scrollWidth;
            
            // 如果内容超出预设高度，调整容器高度
            if (actualHeight > parseInt(tempContainer.style.height || '0')) {
              tempContainer.style.height = `${actualHeight}px`;
            }
            
            // 简化等待逻辑，直接等待一段时间确保样式加载
            await new Promise(resolve => setTimeout(resolve, 1000));

            // 转换为 Canvas
            const canvas = await enhancedHtmlToCanvas(generatedElement);
            
            // 清理临时元素和恢复页面状态
            const cleanupContainer = () => {
              try {
                root.unmount();
                if (document.body.contains(tempContainer)) {
                  document.body.removeChild(tempContainer);
                }
                // 恢复原始的overflow设置
                document.body.style.overflow = originalBodyOverflow;
                document.documentElement.style.overflow = originalDocumentOverflow;
              } catch (cleanupError) {
                console.warn('清理临时元素失败:', cleanupError);
              }
            };
            
            cleanupContainer();
            resolve(canvas);
          } catch (error) {
            // 清理临时元素和恢复页面状态
            const cleanupContainer = () => {
              try {
                root.unmount();
                if (document.body.contains(tempContainer)) {
                  document.body.removeChild(tempContainer);
                }
                // 恢复原始的overflow设置
                document.body.style.overflow = originalBodyOverflow;
                document.documentElement.style.overflow = originalDocumentOverflow;
              } catch (cleanupError) {
                console.warn('清理临时元素失败:', cleanupError);
              }
            };
            
            cleanupContainer();
            reject(error);
          }
        }, 3000); // 增加等待时间到3秒，确保React完全渲染和内容布局完成
      }
    ).catch((importError) => {
      // 清理临时元素和恢复页面状态
      try {
        if (document.body.contains(tempContainer)) {
          document.body.removeChild(tempContainer);
        }
        // 恢复原始的overflow设置
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalDocumentOverflow;
      } catch (cleanupError) {
        console.warn('清理失败:', cleanupError);
      }
      reject(importError);
    });
  });
}

/**
 * 将 HTML 元素转换为图片并下载 - 增强版
 */
export async function downloadImageFromElement(
  element: HTMLElement,
  filename: string = 'marathon-schedule.png'
): Promise<void> {
  try {
    console.log('开始下载训练计划图片...');

    const canvas = await enhancedHtmlToCanvas(element);

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            console.log('训练计划图片生成成功，开始下载');
            saveAs(blob, filename);
            resolve();
          } else {
            reject(new Error('无法生成图片 blob'));
          }
        },
        'image/png',
        1.0
      );
    });
  } catch (error) {
    console.error('下载训练计划图片失败:', error);
    throw error;
  }
}

/**
 * 独立生成并下载课表图片
 */
export async function downloadScheduleImage({
  schedule,
  raceName,
  filename,
  width = 1024,
  height = 1280,
}: {
  schedule: string;
  raceName?: string;
  filename?: string;
  width?: number;
  height?: number;
}): Promise<void> {
  try {
    const canvas = await generateScheduleImage({
      schedule,
      raceName,
      width,
      height,
    });

    const defaultFilename = `${raceName || '马拉松训练计划'}-${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.png`;

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            saveAs(blob, filename || defaultFilename);
            resolve();
          } else {
            reject(new Error('无法生成图片 blob'));
          }
        },
        'image/png',
        1.0
      );
    });
  } catch (error) {
    console.error('独立下载课表图片失败:', error);
    throw error;
  }
}

/**
 * 将 HTML 元素转换为图片并复制到剪贴板 - 增强版
 */
export async function copyImageFromElement(
  element: HTMLElement
): Promise<void> {
  try {
    console.log('开始复制训练计划图片到剪贴板...');

    // 检查浏览器支持
    if (!navigator.clipboard) {
      throw new Error('浏览器不支持剪贴板功能');
    }

    const canvas = await enhancedHtmlToCanvas(element);

    return new Promise((resolve, reject) => {
      canvas.toBlob(async (blob) => {
        if (blob) {
          try {
            const clipboardItem = new ClipboardItem({
              'image/png': blob,
            });
            await navigator.clipboard.write([clipboardItem]);
            console.log('训练计划图片复制到剪贴板成功');
            resolve();
          } catch (clipboardError) {
            console.error('写入剪贴板失败:', clipboardError);
            reject(new Error('写入剪贴板失败'));
          }
        } else {
          reject(new Error('无法生成图片 blob'));
        }
      }, 'image/png');
    });
  } catch (error) {
    console.error('复制训练计划图片失败:', error);
    throw error;
  }
}

/**
 * 独立生成并复制课表图片到剪贴板
 */
export async function copyScheduleImage({
  schedule,
  raceName,
  width = 1024,
  height = 1280,
}: {
  schedule: string;
  raceName?: string;
  width?: number;
  height?: number;
}): Promise<void> {
  try {
    if (!navigator.clipboard) {
      throw new Error('浏览器不支持剪贴板功能');
    }

    const canvas = await generateScheduleImage({
      schedule,
      raceName,
      width,
      height,
    });

    return new Promise((resolve, reject) => {
      canvas.toBlob(async (blob) => {
        if (blob) {
          try {
            const clipboardItem = new ClipboardItem({
              'image/png': blob,
            });
            await navigator.clipboard.write([clipboardItem]);
            resolve();
          } catch (clipboardError) {
            reject(new Error('写入剪贴板失败'));
          }
        } else {
          reject(new Error('无法生成图片 blob'));
        }
      }, 'image/png');
    });
  } catch (error) {
    console.error('独立复制课表图片失败:', error);
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
 * 获取元素渲染状态信息 - 增强版
 */
export function getMd2PosterInfo(element: HTMLElement): {
  hasCanvas: boolean;
  canvasSize?: { width: number; height: number };
  posterTheme?: string;
} {
  // 检查元素是否可见和准备就绪
  const isVisible = element.offsetWidth > 0 && element.offsetHeight > 0;
  const rect = element.getBoundingClientRect();
  
  // 检查是否在视口中
  const isInViewport = rect.top >= 0 && rect.left >= 0 && 
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth);

  return {
    hasCanvas: isVisible && (isInViewport || element.classList.contains('schedule-image-generator')),
    canvasSize: isVisible ? { 
      width: Math.round(rect.width), 
      height: Math.round(rect.height) 
    } : undefined,
    posterTheme: element.className || undefined,
  };
}

// 向后兼容的旧函数名
export const htmlToCanvas = enhancedHtmlToCanvas;
