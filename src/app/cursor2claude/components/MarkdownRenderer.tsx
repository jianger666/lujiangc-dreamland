"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="animate-pulse">加载中...</div>;
  }

  return (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          code: (props: any) => {
            const { inline, className, children, ...rest } = props;
            const match = /language-(\w+)/.exec(className || "");
            return !inline && match ? (
              <SyntaxHighlighter
                style={atomDark as any}
                language={match[1]}
                PreTag="div"
                className="rounded-lg"
                {...rest}
              >
                {String(children).replace(/\n$/, "")}
              </SyntaxHighlighter>
            ) : (
              <code
                className="rounded bg-gray-100 px-1 py-0.5 font-mono text-sm dark:bg-gray-800"
                {...rest}
              >
                {children}
              </code>
            );
          },
          h1: ({ children }) => (
            <h1 className="mb-6 mt-8 text-4xl font-bold text-gray-900 dark:text-gray-100">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-4 mt-8 border-b border-gray-200 pb-2 text-3xl font-semibold text-gray-800 dark:border-gray-700 dark:text-gray-200">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-3 mt-6 text-2xl font-semibold text-gray-800 dark:text-gray-200">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="mb-4 leading-relaxed text-gray-700 dark:text-gray-300">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="mb-4 ml-6 space-y-2 text-gray-700 dark:text-gray-300">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-4 ml-6 list-decimal space-y-2 text-gray-700 dark:text-gray-300">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="list-disc marker:text-blue-500">{children}</li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="mb-4 border-l-4 border-blue-500 bg-blue-50 py-2 pl-4 italic text-gray-700 dark:bg-blue-900/20 dark:text-gray-300">
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-blue-600 underline hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          img: ({ src, alt }) => (
            <img
              src={src}
              alt={alt}
              className="my-4 h-auto max-w-full rounded-lg shadow-md"
            />
          ),
          table: ({ children }) => (
            <div className="mb-4 overflow-x-auto">
              <table className="min-w-full border border-gray-200 dark:border-gray-700">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-gray-200 bg-gray-50 px-4 py-2 text-left font-semibold text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-gray-200 px-4 py-2 text-gray-700 dark:border-gray-700 dark:text-gray-300">
              {children}
            </td>
          ),
          hr: () => (
            <hr className="my-8 border-t border-gray-200 dark:border-gray-700" />
          ),
          strong: ({ children }) => (
            <strong className="font-bold text-gray-900 dark:text-gray-100">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-gray-800 dark:text-gray-200">
              {children}
            </em>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
