# Next.js 项目

使用 TypeScript 和 Next.js 构建的现代化 Web 应用。

## 开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build
```

## 项目结构

```
/src
  /app         # 应用逻辑和页面
  /components  # 公共组件
    /ui        # 基础UI组件
    /forms     # 表单组件
    /layout    # 布局组件
  /lib         # 工具函数和辅助方法
```

## 代码规范

- 使用函数式组件和React Hooks
- 优先使用服务端组件(RSC)
- 客户端组件需要明确标记 `'use client'`
- 使用Tailwind CSS进行样式设计
- 组件命名使用PascalCase
- 文件和目录使用kebab-case
