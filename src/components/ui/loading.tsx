import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const loadingVariants = cva('flex items-center justify-center', {
  variants: {
    variant: {
      default: 'text-primary',
      secondary: 'text-secondary',
      destructive: 'text-destructive',
      muted: 'text-muted-foreground',
    },
    size: {
      default: 'h-10 w-10',
      sm: 'h-6 w-6',
      lg: 'h-16 w-16',
    },
    fullPage: {
      true: 'fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm dark:bg-background/80 w-full h-full min-h-screen',
      false: '',
    },
    container: {
      true: 'absolute inset-0 bg-background/60 backdrop-blur-[1px] dark:bg-background/80 z-10 h-full w-full',
      false: '',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
    fullPage: false,
    container: false,
  },
});

export interface LoadingProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof loadingVariants> {
  text?: string;
  /**
   * 是否显示在容器内（需要将父容器设置为relative）
   */
  container?: boolean;
  /**
   * 容器背景颜色类名
   */
  containerClassName?: string;
  /**
   * 是否显示为全屏加载状态
   * 设置为true时会固定在视口中心，占满整个屏幕
   */
  fullPage?: boolean;
}

const Loading = React.forwardRef<HTMLDivElement, LoadingProps>(
  (
    {
      className,
      variant,
      size,
      fullPage,
      container,
      containerClassName,
      text,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        className={cn(
          loadingVariants({
            variant,
            size,
            fullPage,
            container,
            className,
          }),
          containerClassName,
        )}
        ref={ref}
        {...props}
      >
        <div
          className={cn(
            'flex flex-col items-center gap-2',
            (container || fullPage) &&
              'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
          )}
        >
          <Loader2
            className={cn(
              'animate-spin',
              size === 'lg'
                ? 'h-10 w-10'
                : size === 'sm'
                  ? 'h-4 w-4'
                  : 'h-6 w-6',
              (fullPage || container) && 'h-10 w-10',
            )}
          />
          {text && (
            <p className="max-w-[300px] overflow-hidden text-ellipsis whitespace-nowrap text-center text-sm font-medium text-muted-foreground">
              {text}
            </p>
          )}
        </div>
      </div>
    );
  },
);
Loading.displayName = 'Loading';

export { Loading, loadingVariants };
