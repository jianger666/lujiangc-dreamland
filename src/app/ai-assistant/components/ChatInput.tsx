'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Send } from 'lucide-react';
import { AIModel } from '../types';

interface ChatInputProps {
  isLoading: boolean;
  modelId: string;
  availableModels: AIModel[];
  onSendMessage: (content: string) => void;
  onChangeModel: (modelId: string) => void;
}

export function ChatInput({
  isLoading,
  modelId,
  availableModels,
  onSendMessage,
  onChangeModel,
}: ChatInputProps) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    onSendMessage(input);
    setInput('');
  };

  return (
    <div className="border-t border-border p-4">
      <form onSubmit={handleSubmit} className="flex space-x-2">
        <Select value={modelId} onValueChange={onChangeModel}>
          <SelectTrigger className="w-auto md:w-40">
            <SelectValue placeholder="选择模型" />
          </SelectTrigger>
          <SelectContent>
            {availableModels.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                {model.provider}: {model.id.split('/').pop()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="发送消息..."
          disabled={isLoading}
          className="max-h-[160px] min-h-[40px] flex-1 py-2"
          rows={1}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />

        <Button type="submit" disabled={isLoading || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
