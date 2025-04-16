'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Edit, Send, X, Trash2 } from 'lucide-react';
import { useAIAssistant } from '../hooks';

export function ConversationHeader() {
  const {
    activeConversation,
    saveEditedTitle: onSaveTitle,
    clearMessages: onClearMessages,
  } = useAIAssistant();

  const [editingTitle, setEditingTitle] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  if (!activeConversation) {
    return null;
  }

  const startEditingTitle = () => {
    setEditingTitle(activeConversation.title);
    setIsEditingTitle(true);
  };

  const handleSaveEditedTitle = () => {
    if (!editingTitle.trim()) return;
    onSaveTitle(editingTitle);
    setIsEditingTitle(false);
  };

  return (
    <div className="flex items-center justify-between border-b border-border p-3">
      <div className="flex items-center space-x-2">
        {isEditingTitle ? (
          <div className="flex items-center space-x-2">
            <Input
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              className="h-8 w-48"
              autoFocus
              maxLength={10}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveEditedTitle();
              }}
            />
            <Button
              variant="ghost"
              size="icon"
              title="保存标题"
              className="h-8 w-8"
              onClick={handleSaveEditedTitle}
            >
              <Send className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              title="取消编辑"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsEditingTitle(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            <span className="font-medium">{activeConversation.title}</span>
            <Button
              variant="ghost"
              title="编辑标题"
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
        variant="ghost"
        size="sm"
        onClick={onClearMessages}
        title="清空对话"
      >
        <Trash2 className="h-4 w-4" />
        清空对话
      </Button>
    </div>
  );
}
