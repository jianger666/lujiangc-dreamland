import React from 'react';
import { cn } from '@/lib/utils';

interface DotLoadingProps {
  /**
   * 如果为 true，则显示为覆盖整个父容器的加载层
   * @default false
   */
  overlay?: boolean;
  /**
   * 自定义 CSS 类名
   */
  className?: string;
  /**
   * 覆盖层的背景色，默认为 var(--background)
   */
  overlayBackground?: string;
}

export function DotLoading({
  overlay = false,
  className,
  overlayBackground = 'var(--background)',
}: DotLoadingProps) {
  const dots = (
    <div className="flex space-x-1">
      <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" />
      <div
        className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground"
        style={{ animationDelay: '0.2s' }}
      />
      <div
        className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground"
        style={{ animationDelay: '0.4s' }}
      />
    </div>
  );

  if (overlay) {
    return (
      <div
        className={cn(
          'absolute inset-0 z-10 flex items-center justify-center',
          className,
        )}
        style={{ backgroundColor: overlayBackground }}
      >
        {dots}
      </div>
    );
  }

  return <div className={cn(className)}>{dots}</div>;
}
