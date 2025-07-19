import React, { useCallback, memo, useMemo } from "react";
import { cn } from "@/lib/utils";
import { AiRoleEnum } from "@/types/ai-assistant";
import ReactMarkdown, { Components } from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import { CopyButton } from "./CopyButton";

// 消息内容组件
const MessageContentComponent = ({
  content,
  role,
}: {
  content: string;
  role: AiRoleEnum;
}) => {
  // 创建代码文本提取函数，处理复杂的React元素树
  const extractTextContent = useCallback((nodes: React.ReactNode): string => {
    if (!nodes) return "";

    if (typeof nodes === "string") return nodes;

    if (Array.isArray(nodes)) {
      return nodes.map(extractTextContent).join("");
    }

    // 处理React元素 (如span标签等)
    if (
      typeof nodes === "object" &&
      nodes !== null &&
      "props" in nodes &&
      typeof nodes.props === "object" &&
      nodes.props !== null &&
      "children" in nodes.props
    ) {
      return extractTextContent(nodes.props.children as React.ReactNode);
    }

    return "";
  }, []);

  const MarkdownComponents = useMemo<Components>(
    () => ({
      a(props) {
        return <a target="_blank" {...props} />;
      },
      table({ className, ...rest }) {
        return <table className={cn(className, "border-collapse")} {...rest} />;
      },
      th({ className, ...rest }) {
        return (
          <th
            className={cn(
              className,
              "border border-foreground bg-card bg-opacity-50 p-2",
            )}
            {...rest}
          />
        );
      },
      td({ className, ...rest }) {
        return (
          <td
            className={cn(className, "border border-foreground p-2")}
            {...rest}
          />
        );
      },
      code({ className, children, ...rest }) {
        const match = /language-(\w+)/.exec(className || "");
        const language = match?.[1];

        if (!language) {
          return (
            <code className={cn(className)} {...rest}>
              {children}
            </code>
          );
        }

        // 提取代码内容
        const codeContent = extractTextContent(children);

        return (
          <div className="relative overflow-hidden rounded-md">
            <div
              className={cn(
                role === AiRoleEnum.User ? "bg-card" : "bg-accent",
                "flex items-center justify-between px-4 py-1.5 text-xs text-muted-foreground",
              )}
            >
              <span>{language}</span>
              <CopyButton textToCopy={codeContent} title="复制代码" />
            </div>

            <code
              className={cn(
                className,
                "block w-full overflow-x-auto p-4 text-xs",
              )}
              {...rest}
            >
              {children}
            </code>
          </div>
        );
      },
      pre(props) {
        const { className, ...rest } = props;
        return (
          <pre
            className={cn(
              className,
              "overflow-hidden bg-transparent p-0 text-xs",
            )}
            {...rest}
          />
        );
      },
    }),
    [role, extractTextContent],
  );

  // 使用相同的Markdown渲染逻辑，但为用户消息设置不同的样式类
  return (
    <div
      className={cn(
        "prose prose-sm max-w-none break-words",
        role === AiRoleEnum.User
          ? "prose-white dark:prose-invert"
          : "dark:prose-invert",
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]}
        rehypePlugins={[rehypeRaw, rehypeKatex, rehypeHighlight]}
        components={MarkdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export const MessageContent = memo(MessageContentComponent);
