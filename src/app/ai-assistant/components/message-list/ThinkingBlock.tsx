import React from 'react';

// 思考过程组件
export function ThinkingBlock({ content }: { content: string }) {
  if (!content || content.trim() === '') return null;

  return (
    <div className="flex justify-start">
      <div className="bg-muted/50 max-w-[85%] rounded-lg border border-dashed p-3 text-xs md:max-w-[70%] xl:max-w-[800px]">
        <div className="text-xs font-medium text-muted-foreground">
          思考过程
        </div>
        <div className="mt-1 whitespace-pre-wrap text-muted-foreground">
          {content}
        </div>
      </div>
    </div>
  );
}
