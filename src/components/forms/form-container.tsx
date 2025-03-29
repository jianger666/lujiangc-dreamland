import {
  FormProvider,
  useForm,
  FieldErrors,
  DefaultValues,
  FieldValues,
  Mode,
} from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

type ValueChangeHandler<T> = (changedValues: Partial<T>, values: T) => void;

interface FormContainerProps<T extends FieldValues> {
  initialValues?: DefaultValues<T>;
  onFinish: (values: T) => Promise<void> | void;
  onFinishFailed?: (errors: FieldErrors<T>) => void;
  onReset?: () => void;
  children: React.ReactNode;
  submitText?: string;
  resetText?: string;
  className?: string;
  showReset?: boolean;
  disabled?: boolean;
  autoSubmit?: boolean;
  syncToUrl?: boolean;
  layout?: 'vertical' | 'horizontal' | 'inline';
  loading?: boolean;
  onValuesChange?: ValueChangeHandler<T>;
  schema?: z.ZodType<T>;
  mode?: Mode;
}

export function FormContainer<T extends FieldValues>({
  initialValues,
  onFinish,
  onFinishFailed,
  onReset,
  children,
  submitText = '提交',
  resetText = '重置',
  className,
  showReset = true,
  disabled = false,
  autoSubmit = false,
  syncToUrl = false,
  layout = 'vertical',
  loading: externalLoading,
  onValuesChange,
  schema,
  mode = 'onChange',
}: FormContainerProps<T>) {
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const previousValues = useRef<T | null>(null);
  const [internalLoading, setInternalLoading] = useState(false);

  // 使用内部或外部控制的loading状态
  const loading =
    externalLoading !== undefined ? externalLoading : internalLoading;

  // 合并从URL和初始值获取的表单数据
  const getInitialValues = (): DefaultValues<T> => {
    if (!syncToUrl) return initialValues || ({} as DefaultValues<T>);

    try {
      const urlValues: Record<string, unknown> = {};

      // 从URL参数中解析值
      for (const [key, value] of searchParams.entries()) {
        if (!value) continue;

        // 处理数组类型（逗号分隔的值）
        if (value.includes(',')) {
          urlValues[key] = value.split(',');
        }
        // 处理单个值但对应字段可能是数组的情况
        else if (
          initialValues &&
          typeof initialValues === 'object' &&
          Array.isArray((initialValues as Record<string, unknown>)[key])
        ) {
          urlValues[key] = [value]; // 保持为数组格式
        }
        // 处理布尔值
        else if (value === 'true') {
          urlValues[key] = true;
        } else if (value === 'false') {
          urlValues[key] = false;
        }
        // 处理数字 - 保持字符串格式以确保类型一致性
        else if (!isNaN(Number(value)) && value.trim() !== '') {
          // 与初始值类型保持一致
          if (
            initialValues &&
            typeof initialValues === 'object' &&
            typeof (initialValues as Record<string, unknown>)[key] === 'number'
          ) {
            urlValues[key] = Number(value);
          } else {
            // 保持字符串格式
            urlValues[key] = value;
          }
        }
        // 处理JSON
        else if (
          (value.startsWith('{') && value.endsWith('}')) ||
          (value.startsWith('[') && value.endsWith(']'))
        ) {
          try {
            urlValues[key] = JSON.parse(value);
          } catch {
            urlValues[key] = value;
          }
        }
        // 处理普通字符串
        else {
          urlValues[key] = value;
        }
      }

      // 合并初始值和URL值（URL值优先）
      return {
        ...((initialValues as object) || {}),
        ...urlValues,
      } as DefaultValues<T>;
    } catch (error) {
      console.error('解析URL参数失败:', error);
      return initialValues || ({} as DefaultValues<T>);
    }
  };

  // 初始化表单
  const methods = useForm<T>({
    defaultValues: getInitialValues(),
    mode,
    resolver: schema ? zodResolver(schema) : undefined,
  });

  // 初始挂载时设置表单状态
  useEffect(() => {
    if (!isInitialized) {
      previousValues.current = methods.getValues();
      setIsInitialized(true);
    }
  }, [isInitialized, methods]);

  // 监听表单值变化
  useEffect(() => {
    if (!onValuesChange && !autoSubmit) return;

    const subscription = methods.watch((formValues, { name, type }) => {
      if (type !== 'change') return;

      const currentValues = methods.getValues();

      // 处理值变化回调
      if (onValuesChange && previousValues.current) {
        const changedValues: Partial<T> = {};

        if (name) {
          // 获取变化的字段
          const prevValue = getNestedValue(previousValues.current, name);
          const currentValue = getNestedValue(currentValues, name);

          if (prevValue !== currentValue) {
            setNestedValue(changedValues, name, currentValue);
          }
        }

        if (Object.keys(changedValues).length > 0) {
          onValuesChange(changedValues, currentValues);
        }
      }

      // 自动提交
      if (autoSubmit && isInitialized) {
        methods.handleSubmit(handleSubmit, handleError)();
      }

      previousValues.current = { ...currentValues };
    });

    return () => subscription.unsubscribe();
  }, [methods, onValuesChange, autoSubmit, isInitialized]);

  // 获取嵌套对象的值
  const getNestedValue = (
    obj: Record<string, unknown>,
    path: string,
  ): unknown => {
    const keys = path.split('.');
    return keys.reduce((acc, key) => {
      if (acc && typeof acc === 'object' && acc !== null) {
        return (acc as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj as unknown);
  };

  // 设置嵌套对象的值
  const setNestedValue = (
    obj: Record<string, unknown>,
    path: string,
    value: unknown,
  ): void => {
    const keys = path.split('.');
    const lastKey = keys.pop()!;

    const target = keys.reduce((acc, key) => {
      if (acc[key] === undefined) acc[key] = {};
      return acc[key] as Record<string, unknown>;
    }, obj);

    target[lastKey] = value;
  };

  // 将表单数据同步到URL
  const updateUrlWithFormData = (data: T) => {
    try {
      const params = new URLSearchParams();

      Object.entries(data as Record<string, unknown>).forEach(
        ([key, value]) => {
          if (value === undefined || value === null || value === '') {
            return;
          }

          // 处理不同类型的值
          if (Array.isArray(value)) {
            // 数组类型使用逗号分隔
            if (value.length > 0) {
              params.set(key, value.join(','));
            }
          } else if (typeof value === 'object' && value !== null) {
            // 对象类型转为JSON
            params.set(key, JSON.stringify(value));
          } else {
            // 基本类型直接转字符串
            params.set(key, String(value));
          }
        },
      );

      // 更新URL，不刷新页面，不使用router.replace避免触发请求
      const query = params.toString();
      const newPath = window.location.pathname + (query ? `?${query}` : '');

      // 使用原生history API更新URL而不触发导航事件
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', newPath);
      }
    } catch (error) {
      console.error('同步URL参数失败:', error);
    }
  };

  // 提交处理函数
  const handleSubmit = async (data: T) => {
    // 同步到URL（如果启用）
    if (syncToUrl) {
      updateUrlWithFormData(data);
    }

    // 如果不是外部控制loading，则在内部管理
    if (externalLoading === undefined) {
      try {
        setInternalLoading(true);
        // 调用表单提交回调（支持Promise）
        const result = onFinish(data);
        if (result instanceof Promise) {
          await result;
        }
      } catch (error) {
        console.error('表单提交失败:', error);
      } finally {
        setInternalLoading(false);
      }
    } else {
      // 如果是外部控制loading，则直接调用onFinish
      onFinish(data);
    }
  };

  // 错误处理函数
  const handleError = (errors: FieldErrors<T>) => {
    if (onFinishFailed) {
      onFinishFailed(errors);
    }
  };

  // 重置处理函数
  const handleReset = () => {
    // 重置表单
    methods.reset(initialValues || ({} as DefaultValues<T>));

    // 清除URL参数（如果启用），直接使用history API而不是router
    if (syncToUrl && typeof window !== 'undefined') {
      window.history.replaceState({}, '', window.location.pathname);
    }

    // 调用外部重置回调
    if (onReset) {
      onReset();
    }

    // 更新前值引用
    previousValues.current = methods.getValues();
  };

  // 表单样式
  const formClassName = cn(
    'space-y-4',
    {
      'flex flex-col': layout === 'vertical',
      'flex flex-row items-start gap-4': layout === 'horizontal',
      'flex items-baseline flex-wrap gap-4': layout === 'inline',
    },
    className,
  );

  // 按钮区样式
  const buttonAreaClassName = cn(
    'flex',
    showReset ? 'justify-between' : 'justify-end',
    layout === 'horizontal' ? 'items-end' : '',
    layout === 'inline' ? 'self-end' : '',
  );

  return (
    <FormProvider {...methods}>
      <form
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault(); // 阻止默认表单提交
          if (!loading) {
            methods.handleSubmit(handleSubmit, handleError)(e);
          }
        }}
        noValidate // 禁用浏览器默认验证
        className={formClassName}
      >
        <div className={cn(layout === 'horizontal' ? 'flex-1' : 'w-full')}>
          {children}
        </div>

        <div className={buttonAreaClassName}>
          {showReset && (
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={disabled || loading}
            >
              {resetText}
            </Button>
          )}

          <Button
            onClick={async () => {
              if (!loading) {
                // 在提交前进行所有字段触发验证
                const isValid = await methods.trigger();
                if (isValid) {
                  methods.handleSubmit(handleSubmit, handleError)();
                } else {
                  // 显示验证错误
                  const errors = methods.formState.errors;
                  if (Object.keys(errors).length > 0) {
                    handleError(errors);
                  }
                }
              }
              return false;
            }}
            disabled={disabled}
            loading={loading}
          >
            {submitText}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
