"use client";

import React from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useCopy } from "@/app/ai-assistant/hooks";

/**
 * 通用复制按钮组件
 */
interface CopyButtonProps {
  textToCopy: string;
  className?: string;
  title?: string;
}

export function CopyButton({
  textToCopy,
  className = "",
  title = "复制",
}: CopyButtonProps) {
  const { copied, copyToClipboard } = useCopy();

  const handleCopy = () => {
    copyToClipboard(textToCopy);
  };

  return (
    <Button
      onClick={handleCopy}
      type="button"
      variant="ghost"
      size="icon"
      className={cn("h-6 w-6", className)}
      title={title}
    >
      {copied ? <Check /> : <Copy />}
    </Button>
  );
}
