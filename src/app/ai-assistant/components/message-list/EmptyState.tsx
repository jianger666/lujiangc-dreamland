import React from 'react';
import { Bot } from 'lucide-react';

// 空状态组件
export function EmptyState() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <Bot className="mx-auto h-12 w-12 text-muted-foreground" />
        <p className="mt-2 text-lg font-medium">开始新的对话</p>
        <p className="text-sm text-muted-foreground">
          发送消息开始与AI助手对话
        </p>
      </div>
    </div>
  );
}
