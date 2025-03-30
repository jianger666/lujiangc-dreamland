'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Send, Bot, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// 消息类型
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

// 初始消息
const INITIAL_MESSAGES: Message[] = [
  {
    id: 'welcome',
    role: 'assistant',
    content: '你好！我是江耳的替身，有什么我能帮你的吗？',
  },
];

// AI助手props接口
interface AIAssistantProps {
  initialPrompt?: string;
  searchQuery?: string;
  triggerLabel?: ReactNode;
  isFloating?: boolean;
}

export function AIAssistant({
  initialPrompt,
  searchQuery = '',
  triggerLabel = '问问江耳的替身',
  isFloating = false,
}: AIAssistantProps) {
  // 对话框开关状态
  const [open, setOpen] = useState(false);
  // 消息列表
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  // 输入框内容
  const [input, setInput] = useState('');
  // 加载状态
  const [isLoading, setIsLoading] = useState(false);
  // 当前流式生成的消息
  const [streamingMessage, setStreamingMessage] = useState('');
  // 消息列表底部ref，用于自动滚动
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // EventSource 引用
  const eventSourceRef = useRef<EventSource | null>(null);

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  // 使用EventSource处理流式响应
  const handleStreamWithEventSource = (
    messages: Message[],
    searchTerms: string,
  ) => {
    // 清理现有的EventSource
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setStreamingMessage('');
    let accumulatedMessage = '';

    // 构建查询参数
    const params = new URLSearchParams();
    params.append('searchQuery', searchTerms);

    // 添加消息
    messages.forEach((msg, index) => {
      params.append(`messages[${index}][role]`, msg.role);
      params.append(`messages[${index}][content]`, msg.content);
    });

    // 创建新的EventSource
    const eventSource = new EventSource(`/api/spark?${params.toString()}`);
    eventSourceRef.current = eventSource;

    // 处理消息事件
    eventSource.onmessage = (event) => {
      try {
        if (event.data === '[DONE]') {
          eventSource.close();
          // 流结束，将累积的消息添加到消息列表
          if (accumulatedMessage) {
            setMessages((prev) => [
              ...prev,
              {
                id: Date.now().toString(),
                role: 'assistant',
                content: accumulatedMessage,
              },
            ]);
            setStreamingMessage('');
          }
          setIsLoading(false);
          return;
        }

        const parsedData = JSON.parse(event.data);
        if (parsedData.content) {
          // 更新流式消息
          accumulatedMessage += parsedData.content;
          setStreamingMessage(accumulatedMessage);
        }
      } catch (error) {
        console.error('解析响应数据出错:', error);
      }
    };

    // 处理错误
    eventSource.onerror = (error) => {
      console.error('EventSource 错误:', error);
      eventSource.close();
      setIsLoading(false);
      // 添加错误消息
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: '抱歉，处理您的请求时出现了错误。请稍后再试。',
        },
      ]);
    };

    return eventSource;
  };

  // 处理提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // 添加用户消息
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // 使用 EventSource 处理流式响应
    handleStreamWithEventSource(
      [...messages, userMessage],
      searchQuery || input,
    );
  };

  // 当对话框打开并且有初始提示时，自动发送
  useEffect(() => {
    if (open && initialPrompt && messages.length === 1) {
      // 使用setTimeout确保对话框完全打开后再发送
      const timer = setTimeout(() => {
        // 添加用户消息
        const userMessage: Message = {
          id: Date.now().toString(),
          role: 'user',
          content: initialPrompt,
        };
        setMessages((prev) => [...prev, userMessage]);
        setIsLoading(true);

        // 使用 EventSource 处理流式响应
        handleStreamWithEventSource(
          [...messages, userMessage],
          searchQuery || initialPrompt,
        );
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [open, initialPrompt, messages, searchQuery]);

  // 关闭对话框时关闭EventSource
  useEffect(() => {
    if (!open && eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, [open]);

  // 组件卸载时关闭EventSource
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // 对话消息自动滚动
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isFloating ? (
          <Button
            size="icon"
            className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full shadow-lg"
          >
            <Bot className="h-6 w-6" />
          </Button>
        ) : (
          <Button variant="outline" size="sm">
            {triggerLabel}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="min-h-[50vh]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            江耳的替身
          </DialogTitle>
        </DialogHeader>

        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto py-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'mb-3 flex items-start',
                message.role === 'user' ? 'justify-end' : 'justify-start',
              )}
            >
              <div
                className={cn(
                  'max-w-[90%] rounded-lg px-4 py-2 md:max-w-[80%]',
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted',
                )}
              >
                {message.role === 'user' ? (
                  message.content
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none overflow-auto whitespace-pre-wrap">
                    {message.content}
                  </div>
                )}
              </div>
            </div>
          ))}
          {/* 显示流式生成中的消息 */}
          {streamingMessage && (
            <div className="mb-3 flex items-start justify-start">
              <div className="max-w-[90%] rounded-lg bg-muted px-4 py-2 md:max-w-[80%]">
                <div className="prose prose-sm dark:prose-invert max-w-none overflow-auto whitespace-pre-wrap">
                  {streamingMessage}
                </div>
              </div>
            </div>
          )}
          {/* 加载指示器 */}
          {isLoading && !streamingMessage && (
            <div className="mb-3 flex items-start justify-start">
              <div className="max-w-[90%] rounded-lg bg-muted px-4 py-2 md:max-w-[80%]">
                <div className="flex space-x-1">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground"></div>
                  <div
                    className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground"
                    style={{ animationDelay: '0.2s' }}
                  ></div>
                  <div
                    className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground"
                    style={{ animationDelay: '0.4s' }}
                  ></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <DialogFooter className="mt-auto flex-shrink-0 border-t border-border pt-4">
          {/* 消息输入框 */}
          <form
            onSubmit={handleSubmit}
            className="flex w-full flex-1 items-center gap-2"
          >
            <div className="relative w-full flex-1">
              <Input
                value={input}
                onChange={handleInputChange}
                placeholder="发送消息..."
                disabled={isLoading}
                className="pr-8"
              />
              {input && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                  onClick={() => setInput('')}
                  disabled={isLoading}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Button
              type="submit"
              size="icon"
              disabled={isLoading || !input.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
