import { useEffect, useRef } from "react";
import { useDebounceCallback } from "usehooks-ts";

/**
 * useFocusTextarea hook的配置选项
 */
export interface UseFocusTextareaOptions {
  isLoading?: boolean;
  conversationId?: string;
  messagesLength?: number;
  debounceDelay?: number;
}

/**
 * useFocusTextarea hook的返回类型
 */
export interface UseFocusTextareaReturn {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  focusTextarea: () => void;
}

/**
 * 文本框聚焦hook
 * 封装文本框的聚焦逻辑，包括加载状态变化、对话切换、消息列表变化等场景
 */
export const useFocusTextarea = ({
  isLoading = false,
  conversationId,
  messagesLength = 0,
  debounceDelay = 50,
}: UseFocusTextareaOptions = {}): UseFocusTextareaReturn => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 防抖的聚焦函数
  const focusTextarea = useDebounceCallback(() => {
    if (textareaRef.current && !isLoading) {
      requestAnimationFrame(() => {
        if (
          textareaRef.current &&
          textareaRef.current !== document.activeElement
        ) {
          textareaRef.current.focus();
        }
      });
    }
  }, debounceDelay);

  // 当isLoading从true变为false时自动聚焦
  useEffect(() => {
    if (!isLoading) {
      console.log("isLoading触发");
      focusTextarea();
    }
  }, [isLoading]);

  // 当对话切换时自动聚焦输入框
  useEffect(() => {
    console.log("conversationId触发");

    focusTextarea();
  }, [conversationId]);

  // 监听消息列表变化，当清空对话后自动聚焦输入框
  useEffect(() => {
    if (messagesLength === 0) {
      console.log("messagesLength触发");

      focusTextarea();
    }
  }, [messagesLength]);

  return {
    textareaRef,
    focusTextarea,
  };
};
