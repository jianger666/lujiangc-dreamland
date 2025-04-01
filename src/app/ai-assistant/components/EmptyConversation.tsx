'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Bot } from 'lucide-react';

interface EmptyConversationProps {
  onCreateConversation: () => void;
}

export function EmptyConversation({
  onCreateConversation,
}: EmptyConversationProps) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <Bot className="mx-auto h-16 w-16 text-muted-foreground" />
        <p className="mt-4 text-lg font-medium">没有选择对话</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={onCreateConversation}
        >
          创建新对话
        </Button>
      </div>
    </div>
  );
}
