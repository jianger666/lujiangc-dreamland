import React from "react";
import { useFormContext } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ValueType = string | number;

interface ToggleOption<T extends ValueType = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

interface ToggleGroupFieldProps<T extends ValueType = string> {
  name: string;
  label?: string;
  description?: string;
  options: ToggleOption<T>[];
  className?: string;
  mode?: "multiple" | "single";
  optionType?: "default" | "button";
  buttonStyle?: "outline" | "solid";
  size?: "small" | "middle" | "large";
  disabled?: boolean;
  onChange?: (value: T | T[]) => void;
  tooltip?: string;
}

export function ToggleGroupField<T extends ValueType = string>({
  name,
  label,
  description,
  options,
  className,
  mode = "single",
  optionType = "default",
  buttonStyle = "outline",
  size = "middle",
  disabled = false,
  onChange,
  tooltip,
}: ToggleGroupFieldProps<T>) {
  const { control } = useFormContext();

  // 根据尺寸获取按钮样式
  const getToggleSize = (): string => {
    switch (size) {
      case "small":
        return "h-8 px-2 text-xs";
      case "large":
        return "h-11 px-5 text-lg";
      default:
        return "h-9 px-3 text-sm";
    }
  };

  // 判断按钮是否为按钮风格
  const isButtonType = optionType === "button";
  // 判断按钮是否为实心风格
  const isSolidStyle = buttonStyle === "solid";

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          {label && (
            <FormLabel>
              {label}
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

          <div className="flex flex-wrap gap-2">
            {options.map((option) => {
              // 判断当前选项是否被选中
              let isPressed = false;

              if (mode === "single") {
                // 处理类型不一致的情况，如数字与字符串
                const optionValueStr = String(option.value);

                // 确保将undefined和null也处理为空字符串
                let currentValueStr = "";
                if (
                  field.value !== null &&
                  field.value !== undefined &&
                  field.value !== ""
                ) {
                  currentValueStr = String(field.value);
                }

                isPressed = optionValueStr === currentValueStr;
              } else {
                isPressed =
                  Array.isArray(field.value) &&
                  field.value.some(
                    (val) => String(val) === String(option.value),
                  );
              }

              // 是否禁用
              const isDisabled = option.disabled || disabled;

              // 按钮样式
              const toggleClassName = cn(
                getToggleSize(),
                // 按钮类型样式
                isButtonType && "rounded-md border",
                // 选中状态样式
                isPressed &&
                  (isSolidStyle
                    ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground shadow-sm"
                    : "border-primary bg-primary/10 text-primary hover:bg-primary/20 shadow-sm"),
                // 未选中状态样式
                !isPressed &&
                  "border border-input bg-background hover:bg-muted hover:text-foreground",
                // 禁用状态样式
                isDisabled && "cursor-not-allowed opacity-50",
              );

              return (
                <Toggle
                  key={String(option.value)}
                  variant={isSolidStyle ? "default" : "outline"}
                  disabled={isDisabled}
                  pressed={isPressed}
                  onPressedChange={(pressed) => {
                    if (mode === "single") {
                      // 单选模式：支持取消选择
                      if (pressed) {
                        // 确保值为字符串而不是null
                        field.onChange(option.value);
                        onChange?.(option.value);
                      } else if (field.value === option.value) {
                        // 当用户取消当前选中的值时，将值设为空字符串
                        field.onChange("");
                        onChange?.("" as unknown as T);
                      }
                    } else {
                      // 多选模式：值为选中项的数组
                      const currentValues = Array.isArray(field.value)
                        ? field.value
                        : [];
                      let newValues: T[];

                      if (pressed) {
                        // 添加选中项
                        newValues = [...currentValues, option.value];
                      } else {
                        // 移除未选中项
                        newValues = currentValues.filter(
                          (val) => val !== option.value,
                        );
                      }

                      field.onChange(newValues);
                      onChange?.(newValues);
                    }
                  }}
                  className={toggleClassName}
                >
                  {option.label}
                </Toggle>
              );
            })}
          </div>

          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
