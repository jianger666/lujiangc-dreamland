'use client';

import React, { forwardRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

interface ScheduleImageGeneratorProps {
  schedule: string;
  raceName?: string;
  className?: string;
  // 强制使用固定尺寸，确保PC和移动端一致
  width?: number;
  height?: number;
}

export const ScheduleImageGenerator = forwardRef<
  HTMLDivElement,
  ScheduleImageGeneratorProps
>(({ schedule, raceName = '马拉松训练计划', width = 1024, height }, ref) => {
  // 根据内容长度动态计算高度
  const estimatedHeight = height || Math.max(1280, schedule.length * 2 + 600);

  if (!schedule) {
    return (
      <div
        ref={ref}
        className="schedule-image-generator"
        style={{
          width: `${width}px`,
          height: `${estimatedHeight}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px',
          background: '#ffffff',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontSize: '16px',
          color: '#6b7280',
        }}
      >
        暂无训练计划内容
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="schedule-image-generator"
      style={{
        width: `${width}px`,
        minHeight: `${estimatedHeight}px`, // 使用minHeight确保内容完全显示
        height: 'auto', // 让高度自适应
        position: 'relative',
        borderRadius: '12px',
        margin: '0 auto',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: '14px',
        lineHeight: '1.5',
        // 使用简化的渐变背景，提高html2canvas兼容性
        background:
          'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)',
        boxSizing: 'border-box',
      }}
    >
      {/* 简化的装饰背景 */}
      <div
        style={{
          position: 'absolute',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          zIndex: '1',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-128px',
            right: '-128px',
            width: '256px',
            height: '256px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.2)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-128px',
            left: '-128px',
            width: '256px',
            height: '256px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.2)',
          }}
        />
      </div>

      {/* 主要内容区域 */}
      <div
        style={{
          position: 'relative',
          zIndex: '10',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100%',
        }}
      >
        {/* 头部 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '32px 32px 24px 32px',
            background: 'rgba(255, 255, 255, 0.15)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
            flexShrink: 0, // 防止头部被压缩
          }}
        >
          <div>
            <h2
              style={{
                fontSize: '24px',
                lineHeight: '1.2',
                fontWeight: '700',
                color: '#ffffff',
                textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                margin: '0 0 4px 0',
              }}
            >
              {raceName}
            </h2>
            <p
              style={{
                fontSize: '16px',
                opacity: '0.9',
                color: '#ffffff',
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                margin: '0',
              }}
            >
              个性化训练计划
            </p>
          </div>
          <div
            style={{
              fontSize: '14px',
              fontWeight: '500',
              color: '#ffffff',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
            }}
          >
            {new Date().toLocaleDateString('zh-CN')}
          </div>
        </div>

        {/* 内容区域 - 关键修改：不使用flex:1，让内容自然伸展 */}
        <div
          style={{
            padding: '24px 32px',
            background: 'rgba(255, 255, 255, 0.95)',
            color: '#374151',
            flexGrow: 1, // 使用flexGrow而不是flex:1
            minHeight: 'fit-content', // 确保内容完全显示
          }}
        >
          <div
            style={{
              fontSize: '14px',
              lineHeight: '1.6',
              maxWidth: 'none',
            }}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkBreaks]}
              components={{
                // 自定义样式确保html2canvas兼容性
                table: ({ children, ...props }) => (
                  <table
                    {...props}
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      marginBottom: '16px',
                      fontSize: '13px',
                      pageBreakInside: 'avoid', // 防止表格被截断
                    }}
                  >
                    {children}
                  </table>
                ),
                th: ({ children, ...props }) => (
                  <th
                    {...props}
                    style={{
                      padding: '12px 8px',
                      background: '#f3f4f6',
                      border: '1px solid #d1d5db',
                      fontWeight: '600',
                      textAlign: 'left',
                      verticalAlign: 'top',
                    }}
                  >
                    {children}
                  </th>
                ),
                td: ({ children, ...props }) => (
                  <td
                    {...props}
                    style={{
                      padding: '12px 8px',
                      border: '1px solid #d1d5db',
                      verticalAlign: 'top',
                      wordBreak: 'break-word', // 确保长文本换行
                    }}
                  >
                    {children}
                  </td>
                ),
                h1: ({ children, ...props }) => (
                  <h1
                    {...props}
                    style={{
                      fontSize: '20px',
                      fontWeight: '700',
                      marginBottom: '16px',
                      marginTop: '24px',
                      color: '#1f2937',
                      pageBreakAfter: 'avoid',
                    }}
                  >
                    {children}
                  </h1>
                ),
                h2: ({ children, ...props }) => (
                  <h2
                    {...props}
                    style={{
                      fontSize: '18px',
                      fontWeight: '600',
                      marginBottom: '12px',
                      marginTop: '20px',
                      color: '#374151',
                      pageBreakAfter: 'avoid',
                    }}
                  >
                    {children}
                  </h2>
                ),
                h3: ({ children, ...props }) => (
                  <h3
                    {...props}
                    style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      marginBottom: '8px',
                      marginTop: '16px',
                      color: '#4b5563',
                      pageBreakAfter: 'avoid',
                    }}
                  >
                    {children}
                  </h3>
                ),
                p: ({ children, ...props }) => (
                  <p
                    {...props}
                    style={{
                      marginBottom: '12px',
                      lineHeight: '1.6',
                      wordBreak: 'break-word',
                    }}
                  >
                    {children}
                  </p>
                ),
                ul: ({ children, ...props }) => (
                  <ul
                    {...props}
                    style={{
                      marginBottom: '12px',
                      paddingLeft: '20px',
                      pageBreakInside: 'avoid',
                    }}
                  >
                    {children}
                  </ul>
                ),
                ol: ({ children, ...props }) => (
                  <ol
                    {...props}
                    style={{
                      marginBottom: '12px',
                      paddingLeft: '20px',
                      pageBreakInside: 'avoid',
                    }}
                  >
                    {children}
                  </ol>
                ),
                li: ({ children, ...props }) => (
                  <li
                    {...props}
                    style={{
                      marginBottom: '4px',
                      wordBreak: 'break-word',
                    }}
                  >
                    {children}
                  </li>
                ),
                strong: ({ children, ...props }) => (
                  <strong
                    {...props}
                    style={{
                      fontWeight: '600',
                      color: '#1f2937',
                    }}
                  >
                    {children}
                  </strong>
                ),
              }}
            >
              {schedule}
            </ReactMarkdown>
          </div>
        </div>

        {/* 底部 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '32px',
            padding: '16px 32px',
            background: 'rgba(255, 255, 255, 0.15)',
            borderTop: '1px solid rgba(255, 255, 255, 0.2)',
            flexShrink: 0, // 防止底部被压缩
          }}
        >
          {['专业训练', '科学规划', '个性定制'].map((text) => (
            <div
              key={text}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#ffffff',
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                }}
              >
                {text}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

ScheduleImageGenerator.displayName = 'ScheduleImageGenerator';
