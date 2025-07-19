import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * 多行骨架配置
   * 为数字时表示行数，每行宽度依次减少
   * 为数组时可以自定义每行的宽度，如 ['100%', '80%', '60%']
   */
  lines?: number | string[];
  /**
   * 多行骨架间距
   */
  lineGap?: string;
}

function Skeleton({
  className,
  lines,
  lineGap = 'space-y-2',
  ...props
}: SkeletonProps) {
  // 如果没有配置多行，则渲染单个骨架
  if (!lines) {
    return (
      <div
        className={cn('animate-pulse rounded-md bg-muted', className)}
        {...props}
      />
    );
  }

  // 处理多行骨架
  const renderLines = () => {
    // 如果lines是数字，生成对应数量的行
    if (typeof lines === 'number') {
      return Array.from({ length: lines }).map((_, index) => {
        // 计算每行宽度，依次减少
        const width = `${100 - index * (100 / (lines * 2))}%`;
        return (
          <div
            key={index}
            className={cn('animate-pulse rounded-md bg-muted', className)}
            style={{ width }}
            {...props}
          />
        );
      });
    }

    // 如果lines是数组，按照数组中的宽度配置渲染
    return lines.map((width, index) => (
      <div
        key={index}
        className={cn('animate-pulse rounded-md bg-muted', className)}
        style={{ width }}
        {...props}
      />
    ));
  };

  return <div className={lineGap}>{renderLines()}</div>;
}

// 删除不必要的全局样式，因为已经在tailwind.config.ts中定义了shimmer动画
// if (typeof document !== 'undefined') {...}

export { Skeleton };
