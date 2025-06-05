import React, { useRef, useEffect, memo } from 'react';
import { cn } from '@/lib/utils';
import { AiRoleEnum, Message, StreamingMessage } from '@/types/ai-assistant';
import { Loading } from '@/components/ui/loading';
import { ThinkingBlock } from './ThinkingBlock';
import { MessageContent } from './MessageContent';
import { CopyButton } from './CopyButton';

// 单个消息组件 - 用于虚拟列表
const MessageItemComponent = ({
  message,
  style,
  setSize,
  index,
  loadingMode,
}: {
  message?: Message | StreamingMessage;
  style: React.CSSProperties;
  setSize: (index: number, size: number) => void;
  index: number;
  loadingMode: boolean;
}) => {
  const itemRef = useRef<HTMLDivElement>(null);
  const role = message?.role ?? AiRoleEnum.Assistant;
  const thinking = message?.thinking ?? undefined;
  const images = message?.images ?? undefined;

  // 动态更新项目高度
  useEffect(() => {
    if (itemRef.current) {
      if (itemRef.current.scrollHeight > 0) {
        setSize(index, itemRef.current.scrollHeight);
      }
    }
    // 依赖项：当消息内容或思考内容变化时重新计算
  }, [message?.content, thinking, images, setSize, index]);

  return (
    <div style={style}>
      {/* 将 padding 应用在内部 div 上，以便 itemRef 能正确测量 */}
      <div ref={itemRef} className="p-3">
        {loadingMode ? (
          <div className="flex justify-start px-3 py-2">
            <div className="rounded-lg bg-card px-4 py-2">
              <Loading dot />
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {thinking && <ThinkingBlock content={thinking} />}
              <div
                className={cn(
                  'group flex',
                  role === AiRoleEnum.User ? 'justify-end' : 'justify-start',
                )}
              >
                <div
                  className={cn(
                    'relative max-w-[85%] rounded-lg px-4 py-2 text-sm md:max-w-[70%] xl:max-w-[800px]',
                    role === AiRoleEnum.User ? 'bg-accent' : 'bg-card',
                  )}
                >
                  {/* 显示图片 */}
                  {images && images.length > 0 && role === AiRoleEnum.User && (
                    <div className="mb-2 space-y-2">
                      {images.length === 1 ? (
                        // 单张图片显示
                        <div className="overflow-hidden rounded-md">
                          <img
                            src={images[0]}
                            alt="用户上传的图片"
                            className="max-h-48 w-auto object-contain"
                          />
                        </div>
                      ) : (
                        // 多张图片网格显示
                        <div className="grid grid-cols-2 gap-2">
                          {images.map((image, index) => (
                            <div
                              key={index}
                              className="overflow-hidden rounded-md"
                            >
                              <img
                                src={image}
                                alt={`用户上传的图片 ${index + 1}`}
                                className="h-24 w-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {message?.content && (
                    <MessageContent content={message.content} role={role} />
                  )}
                  {/* 复制按钮 */}
                  <div
                    className={cn(
                      'absolute top-1 transition-opacity group-hover:opacity-100',
                      'opacity-0', // 初始隐藏
                      role === AiRoleEnum.User ? '-left-10' : '-right-10',
                      'flex items-center',
                    )}
                  >
                    <CopyButton
                      textToCopy={message?.content || ''}
                      title="复制消息"
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export const MessageItem = memo(MessageItemComponent);
