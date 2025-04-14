import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';

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
    overlay: {
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
    overlay: false,
    container: false,
  },
});

export interface LoadingProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof loadingVariants> {
  /**
   * 加载提示文本
   */
  text?: string;
  /**
   * 是否显示加载器
   * @default true
   */
  loading?: boolean;
  /**
   * 是否使用点状加载样式
   * @default false
   */
  dot?: boolean;
  /**
   * 是否显示在容器内（需要将父容器设置为relative）
   */
  container?: boolean;
  /**
   * 容器背景颜色类名
   */
  containerClassName?: string;
  /**
   * 如果为 true，则显示为覆盖整个父容器的加载层
   * @default false
   */
  overlay?: boolean;
  /**
   * 加载器的目标容器
   * 如果提供了target，将使用该元素作为覆盖层的容器
   * 如果未提供target且overlay=true，将使用Portal添加到document.body
   */
  target?: HTMLElement;
  /**
   * z-index值，用于控制覆盖层的层级
   * @default 50
   */
  zIndex?: number;
  /**
   * 是否自动检测并使用父容器的尺寸
   * @default false
   */
  detectParent?: boolean;
  /**
   * 文本的自定义样式类名
   */
  textClassName?: string;
}

// 渲染点状加载器的内容
const DotLoadingContent = ({
  text,
  textClassName,
}: {
  text?: string;
  textClassName?: string;
}) => (
  <div className="flex flex-col items-center gap-2">
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
    {text && (
      <p
        className={cn(
          'mt-2 max-w-[300px] overflow-hidden text-ellipsis whitespace-nowrap text-center text-sm font-medium text-muted-foreground',
          textClassName,
        )}
      >
        {text}
      </p>
    )}
  </div>
);

// 渲染旋转加载器的内容
const SpinnerLoadingContent = ({
  text,
  size = 'default',
}: {
  text?: string;
  size?: 'default' | 'sm' | 'lg';
}) => (
  <div className="flex flex-col items-center gap-2">
    <Loader2
      className={cn(
        'animate-spin',
        size === 'lg' ? 'h-10 w-10' : size === 'sm' ? 'h-4 w-4' : 'h-6 w-6',
      )}
    />
    {text && (
      <p className="max-w-[300px] overflow-hidden text-ellipsis whitespace-nowrap text-center text-sm font-medium text-muted-foreground">
        {text}
      </p>
    )}
  </div>
);

const Loading = React.forwardRef<HTMLDivElement, LoadingProps>(
  (
    {
      className,
      variant,
      size,
      overlay,
      container,
      containerClassName,
      text,
      textClassName,
      loading = true,
      dot = false,
      target,
      zIndex = 50,
      detectParent = false,
      ...props
    },
    ref,
  ) => {
    const [mounted, setMounted] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = React.useState({ width: 0, height: 0 });

    React.useEffect(() => {
      setMounted(true);
      return () => setMounted(false);
    }, []);

    React.useEffect(() => {
      if (detectParent && containerRef.current) {
        const parent = containerRef.current.parentElement;
        if (parent) {
          const updateDimensions = () => {
            const { width, height } = parent.getBoundingClientRect();
            setDimensions({ width, height });
          };

          updateDimensions();

          // 监听窗口大小变化
          window.addEventListener('resize', updateDimensions);

          return () => {
            window.removeEventListener('resize', updateDimensions);
          };
        }
      }
    }, [detectParent]);

    // 如果loading为false，不渲染任何内容
    if (!loading) return null;

    // 处理背景样式
    const getOverlayStyle = () => {
      return {
        zIndex: zIndex,
      };
    };

    // 选择加载内容
    const loadingContent = dot ? (
      <DotLoadingContent text={text} textClassName={textClassName} />
    ) : (
      <div
        className={cn(
          'flex flex-col items-center gap-2',
          (container || overlay) &&
            'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
        )}
      >
        <SpinnerLoadingContent text={text} size={size || 'default'} />
      </div>
    );

    // 如果不是overlay模式，直接渲染加载内容
    if (!overlay) {
      return (
        <div ref={containerRef} className={cn(className)}>
          {loadingContent}
        </div>
      );
    }

    // 处理自动检测父容器尺寸
    if (detectParent && overlay) {
      return (
        <div
          ref={containerRef}
          className={cn(
            'bg-background/80 absolute flex items-center justify-center backdrop-blur-sm',
            className,
          )}
          style={{
            top: 0,
            left: 0,
            width: dimensions.width || '100%',
            height: dimensions.height || '100%',
            zIndex: zIndex,
          }}
          {...props}
        >
          {loadingContent}
        </div>
      );
    }

    // 对于目标容器的处理
    if (target) {
      // 如果提供了目标容器，在目标容器内创建相对定位的覆盖层
      return (
        <div
          ref={containerRef}
          className="bg-background/80 absolute inset-0 flex items-center justify-center backdrop-blur-sm"
          style={getOverlayStyle()}
          {...props}
        >
          {loadingContent}
        </div>
      );
    }

    // 创建覆盖层元素
    const overlayElement = (
      <div
        className={cn(
          loadingVariants({
            variant,
            size,
            overlay,
            className,
          }),
          'bg-background/80 fixed inset-0 flex h-full min-h-screen w-full items-center justify-center backdrop-blur-sm',
        )}
        style={getOverlayStyle()}
        {...props}
      >
        {loadingContent}
      </div>
    );

    // 使用Portal将覆盖层添加到body
    if (mounted) {
      return createPortal(overlayElement, document.body);
    }

    // 基本渲染逻辑
    return (
      <div
        className={cn(
          loadingVariants({
            variant,
            size,
            overlay,
            container,
            className,
          }),
          containerClassName,
        )}
        ref={ref}
        {...props}
      >
        {loadingContent}
      </div>
    );
  },
);
Loading.displayName = 'Loading';

// 全局加载API管理
export interface LoadingInstance {
  close: () => void;
}

type LoadingOptions = Omit<LoadingProps, 'loading'>;

// 全局加载状态管理
class LoadingManager {
  private static instances: Map<
    string,
    { container: HTMLDivElement; root: Root }
  > = new Map();
  private static counter: number = 0;

  /**
   * 创建并显示全局加载
   */
  static show(options: LoadingOptions = {}): LoadingInstance {
    // 创建容器
    const id = `loading-${++this.counter}`;
    const container = document.createElement('div');
    container.id = id;
    document.body.appendChild(container);

    // 创建Root实例
    const root = createRoot(container);

    // 保存实例
    this.instances.set(id, { container, root });

    // 渲染加载组件
    root.render(
      <Loading
        {...options}
        loading={true}
        overlay={true}
        className={cn(
          'fixed inset-0 h-full min-h-screen w-full',
          options.className,
        )}
      />,
    );

    // 返回控制实例
    return {
      close: () => this.close(id),
    };
  }

  /**
   * 关闭指定的加载实例
   */
  static close(id: string): void {
    const instance = this.instances.get(id);
    if (instance) {
      const { container, root } = instance;
      // 取消渲染
      root.unmount();
      // 移除DOM
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
      // 移除实例记录
      this.instances.delete(id);
    }
  }

  /**
   * 关闭所有加载实例
   */
  static closeAll(): void {
    this.instances.forEach(({ container, root }) => {
      // 取消渲染
      root.unmount();
      // 移除DOM
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
    });
    this.instances.clear();
  }
}

// 简化的API函数
const showLoading = (options?: LoadingOptions): LoadingInstance => {
  return LoadingManager.show(options);
};

const closeAllLoading = (): void => {
  LoadingManager.closeAll();
};

export {
  Loading,
  loadingVariants,
  showLoading,
  closeAllLoading,
  LoadingManager,
};
