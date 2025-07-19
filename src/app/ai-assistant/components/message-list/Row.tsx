import React from 'react';
import { ListChildComponentProps } from 'react-window';
import { MessageItem } from './MessageItem';
import { ItemData } from './types';

// 虚拟列表渲染的列表项
export const Row = React.memo(
  ({ data, index, style }: ListChildComponentProps<ItemData>) => {
    const { messages, setSize, isRequesting } = data;

    return (
      <MessageItem
        message={messages[index]}
        style={style}
        setSize={setSize}
        index={index}
        // 如果当前消息是最后一个消息，并且正在请求，则显示加载指示器
        loadingMode={isRequesting && index === messages.length - 1}
      />
    );
  }
);

Row.displayName = 'VirtualRow';
