# 马拉松训练计划 - 图片生成优化

## 功能概述

本次优化主要解决了html2canvas在生成课表图片时的兼容性问题，并确保移动端和PC端的一致性体验。

## 主要改进

### 1. 独立图片生成组件

- 创建了 `ScheduleImageGenerator` 组件，专门用于生成标准化的课表图片
- 使用固定尺寸 (1024x1280)，确保所有平台输出一致
- 优化了样式渲染，避免了复杂CSS属性导致的兼容性问题

### 2. 增强的html2canvas配置

- 限制最大缩放比例，防止内存溢出
- 优化字体和文本渲染
- 移除有问题的CSS效果（如blur）
- 增强错误处理和超时控制

### 3. 智能生成策略

- 优先使用独立生成方式（推荐）
- 保留传统DOM生成作为备选方案
- 自动检测并清理临时DOM元素

## 技术特性

### 兼容性优化

- **简化渐变背景**: 使用html2canvas友好的渐变方案
- **内联样式**: 关键样式使用内联方式，确保渲染正确
- **字体优化**: 明确指定系统字体，提高渲染一致性
- **尺寸固定**: 避免响应式布局在不同设备上的差异

### 性能优化

- **异步渲染**: 非阻塞的图片生成流程
- **内存管理**: 自动清理临时DOM元素
- **错误恢复**: 完善的错误处理和回退机制

## 使用方式

### 独立生成（推荐）

```typescript
import { downloadScheduleImage, copyScheduleImage } from '@/lib/utils/markdown-to-image';

// 下载图片
await downloadScheduleImage({
  schedule: markdownContent,
  raceName: '我的马拉松计划',
  filename: 'my-marathon-plan.png',
  width: 1024,
  height: 1280,
});

// 复制到剪贴板
await copyScheduleImage({
  schedule: markdownContent,
  raceName: '我的马拉松计划',
  width: 1024,
  height: 1280,
});
```

### 传统DOM方式（兼容性备选）

```typescript
import { downloadImageFromElement, copyImageFromElement } from '@/lib/utils/markdown-to-image';

// 从现有DOM元素生成图片
const element = document.getElementById('schedule-content');
await downloadImageFromElement(element, 'schedule.png');
await copyImageFromElement(element);
```

## 组件使用

### ScheduleImageGenerator

专门用于生成标准化课表图片的组件：

```tsx
import { ScheduleImageGenerator } from './components/schedule-image-generator';

<ScheduleImageGenerator
  schedule={markdownContent}
  raceName="马拉松训练计划"
  width={1024}
  height={1280}
/>
```

### ScheduleActions

已优化的操作按钮组件，支持新的生成方式：

```tsx
import { ScheduleActions } from './components/schedule-actions';

<ScheduleActions
  onRegenerate={handleRegenerate}
  getContentElement={() => contentRef.current}
  formData={formData}
  isRegenerating={isLoading}
  schedule={markdownContent} // 新增参数，支持独立生成
/>
```

## 优势总结

1. **一致性**: 移动端和PC端生成相同质量的图片
2. **兼容性**: 解决了复杂CSS在html2canvas中的渲染问题
3. **性能**: 优化了内存使用和渲染速度
4. **可靠性**: 增强的错误处理和回退机制
5. **维护性**: 清晰的代码结构和模块化设计

## 技术栈

- React 19
- html2canvas
- TypeScript
- TailwindCSS
- react-markdown 