'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

/**
 * 聊天自动滚动的自定义Hook
 *
 * @param dependencies 依赖数组，当这些值变化时会触发滚动检查
 * @param options 滚动配置项
 * @returns 包含容器引用、底部引用和手动滚动函数的对象
 */
export function useChatScroll<T extends unknown[]>(
  dependencies: T,
  options: {
    scrollBehavior?: ScrollBehavior;
    threshold?: number;
    onScrollStateChange?: (isNearBottom: boolean) => void;
  } = {}
) {
  const {
    scrollBehavior = 'instant',
    threshold = 100,
    onScrollStateChange,
  } = options;

  // 聊天容器引用
  const containerRef = useRef<HTMLDivElement | null>(null);
  // 底部元素引用，用于检测是否接近底部
  const bottomRef = useRef<HTMLDivElement | null>(null);
  // 是否应该自动滚动
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  // 判断是否接近底部的intersection observer
  const observerRef = useRef<IntersectionObserver | null>(null);

  /**
   * 手动滚动到底部
   */
  const scrollToBottom = useCallback(() => {
    if (!bottomRef.current) return;
    bottomRef.current.scrollIntoView({
      behavior: scrollBehavior,
      block: 'end',
    });
  }, [scrollBehavior]);

  /**
   * 计算距离底部的距离
   */
  const getDistanceFromBottom = useCallback(() => {
    if (!containerRef.current) return 0;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    return scrollHeight - scrollTop - clientHeight;
  }, []);

  /**
   * 处理滚动事件 - 检测用户是否手动向上滚动
   */
  const handleScroll = useCallback(() => {
    const distance = getDistanceFromBottom();
    const isNearBottom = distance < threshold;

    // 状态改变时通知外部
    if (shouldAutoScroll !== isNearBottom) {
      setShouldAutoScroll(isNearBottom);
      onScrollStateChange?.(isNearBottom);
    }
  }, [getDistanceFromBottom, threshold, shouldAutoScroll, onScrollStateChange]);

  // 设置 Intersection Observer 来监测底部元素是否可见
  useEffect(() => {
    if (!bottomRef.current) return;

    // 创建观察者实例
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        const isVisible = entry.isIntersecting;

        if (isVisible && !shouldAutoScroll) {
          setShouldAutoScroll(true);
          onScrollStateChange?.(true);
        }
      },
      { threshold: 0.1 }
    );

    // 开始观察底部元素
    observerRef.current.observe(bottomRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [shouldAutoScroll, onScrollStateChange]);

  // 当依赖项变化且应该自动滚动时，滚动到底部
  useEffect(() => {
    if (shouldAutoScroll) {
      scrollToBottom();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencies, shouldAutoScroll]);

  // 组件挂载时滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  return {
    containerRef,
    bottomRef,
    scrollToBottom,
    shouldAutoScroll,
    handleScroll,
  };
}
