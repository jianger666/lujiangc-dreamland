import { useFormContext } from 'react-hook-form';
import React from 'react';
import {
  FormField,
  FormItem as ShadcnFormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '@/components/ui/form';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface FormItemProps {
  name: string;
  label?: string;
  description?: string;
  className?: string;
  children: React.ReactElement;
  showValidation?: boolean;
  tooltip?: string;
  colon?: boolean;
  validateStatus?: 'success' | 'warning' | 'error' | 'validating' | '';
  help?: React.ReactNode;
  layout?: 'vertical' | 'horizontal' | 'inline';
}

export function FormItem({
  name,
  label,
  description,
  className,
  children,
  showValidation = true,
  tooltip,
  colon = true,
  validateStatus,
  help,
  layout = 'vertical',
}: FormItemProps) {
  const { control } = useFormContext();

  // 根据布局设置样式
  const itemClassName = cn(
    'w-full',
    {
      'mb-4': layout === 'vertical',
      'flex items-start': layout === 'horizontal',
      'inline-flex items-center mr-4': layout === 'inline',
    },
    className,
  );

  // 标签样式
  const labelClassName = cn({
    'text-sm font-medium mb-2': layout === 'vertical',
    'text-sm font-medium mr-2 min-w-[80px]': layout === 'horizontal',
    'text-sm font-medium mr-2': layout === 'inline',
  });

  // 控制样式
  const controlClassName = cn({
    'w-full': layout === 'vertical',
    'flex-1': layout === 'horizontal' || layout === 'inline',
  });

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <ShadcnFormItem className={itemClassName}>
          {label && (
            <FormLabel className={labelClassName}>
              {label}
              {colon && <span>:</span>}
              {tooltip && (
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="ml-1 inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border text-xs text-muted-foreground">
                        ?
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </FormLabel>
          )}
          <div className={controlClassName}>
            <FormControl>
              {React.cloneElement(children, { ...field })}
            </FormControl>
            {description && (
              <FormDescription className="text-xs">
                {description}
              </FormDescription>
            )}
            {help && <div className="mt-1 text-xs">{help}</div>}
            {showValidation && validateStatus !== 'success' && <FormMessage />}
          </div>
        </ShadcnFormItem>
      )}
    />
  );
}
