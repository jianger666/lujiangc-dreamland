'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Edit, Send, Trash2, X } from 'lucide-react';
import { Conversation } from './types';

interface ConversationHeaderProps {
  conversation: Conversation;
  onClearMessages: () => void;
  onSaveTitle: (title: string) => void;
}

export function ConversationHeader({
  conversation,
  onClearMessages,
  onSaveTitle,
}: ConversationHeaderProps) {
  const [editingTitle, setEditingTitle] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  const startEditingTitle = () => {
    setEditingTitle(conversation.title);
    setIsEditingTitle(true);
  };

  const saveEditedTitle = () => {
    if (!editingTitle.trim()) return;
    onSaveTitle(editingTitle);
    setIsEditingTitle(false);
  };

  return (
    <div className="flex items-center justify-between border-b border-border p-4">
      <div className="flex items-center space-x-2">
        {isEditingTitle ? (
          <div className="flex items-center space-x-2">
            <Input
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              className="h-8 w-48"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveEditedTitle();
              }}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={saveEditedTitle}
            >
              <Send className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsEditingTitle(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            <span className="font-medium">{conversation.title}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={startEditingTitle}
            >
              <Edit className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      <Button
        variant="outline"
        size="icon"
        onClick={onClearMessages}
        title="清空对话"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
