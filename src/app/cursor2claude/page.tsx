import { Metadata } from "next";
import { MarkdownRenderer } from "./components/MarkdownRenderer";

export const metadata: Metadata = {
  title: "Cursor to Claude Code 使用指南",
  description:
    "学习如何使用我们的API接口来配置Claude Code，实现免费使用Claude Code的效果",
};

const markdownContent = `# Cursor to Claude Code 使用指南

<div style="background: linear-gradient(135deg, #ff6b6b, #feca57); padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center; color: white; font-weight: bold; font-size: 18px;">
⚠️ 重要声明：本项目仅用于学习研究目的，严禁用于商业用途！
</div>

通过本指南，你可以学习如何将 Cursor 的 API 接口转换为 OpenAI 兼容格式，并在 Claude Code 中使用。

## 📋 前置要求

- 有效的 Cursor 账号和会话
- Node.js 环境 (推荐 18.0.0 或更高版本)
- Claude Code 工具

## 🚀 使用步骤

### 第一步：获取 Cursor Session Token

1. 打开 [cursor.com](https://cursor.com) 并登录你的账号
2. 按 \`F12\` 打开浏览器开发者工具
3. 切换到 **Application** (或 **存储**) 标签页
4. 在左侧找到 **Cookies** 或 **Cookies 存储**，点击展开
5. 选择 \`https://cursor.com\` 域名
6. 在右侧找到名为 **\`WorkosCursorSessionToken\`** 的 Cookie
7. 复制该 Cookie 的 **Value** 值（这就是你的 session token）

> 💡 **提示**: 请确保复制完整的 token 值，通常是一个很长的字符串。

### 第二步：获取 Access Token

使用刚才获取的 \`WorkosCursorSessionToken\` 调用我们的 API 来获取标准的 OpenAI 格式 token：

\`\`\`bash
curl --location 'https://token.cursorpro.com.cn/reftoken?token=%E6%82%A8%E7%9A%84WorkosCursorSessionToken'
\`\`\`

**示例响应：**
\`\`\`json
{
  "data": {
    "accessToken": "sk-cursor-abc123...",
    "authId": "user_12345",
    ...
  }
}
\`\`\`

**请保存返回的 \`accessToken\`**，这就是你在下一步中需要用到的 API Key。

> ⚠️ **注意**: 如果返回错误，可能是 session token 已过期，请重新获取。

### 第三步：安装必需工具

\`\`\`bash
# 安装 Claude Code (官方工具)
npm install -g @anthropic-ai/claude-code

# 安装 Claude Code Router (第三方路由器)
npm install -g @musistudio/claude-code-router
\`\`\`

### 第四步：配置 Claude Code Router

#### 📁 配置文件路径

根据你的操作系统，配置文件的位置有所不同：

| 操作系统 | 配置文件路径 |
|---------|-------------|
| **macOS/Linux** | \`~/.claude-code-router/config.json\` |
| **Windows** | \`C:\\Users\\你的用户名\\.claude-code-router\\config.json\` |

#### ⚙️ 配置文件内容

将以下内容写入配置文件：

\`\`\`json
{
  "OPENAI_API_KEY": "你在第二步获取的accessToken",
  "OPENAI_BASE_URL": "https://lujiangc.com/api/cursor2openai/v1",
  "OPENAI_MODEL": "claude-4-sonnet",
  "Providers": [
    {
      "name": "cursor-proxy",
      "api_base_url": "https://lujiangc.com/api/cursor2openai/v1",
      "api_key": "你在第二步获取的accessToken",
      "models": [
        "claude-4-sonnet",
        "claude-3.7-sonnet",
        "claude-3.5-sonnet",
        "gemini-2.5-pro",
        "gpt-4.1",
        "gpt-4o-mini"
      ]
    }
  ],
  "Router": {
    "background": "cursor-proxy,gpt-4o-mini",
    "think": "cursor-proxy,claude-4-sonnet", 
    "longContext": "cursor-proxy,gemini-2.5-pro"
  }
}
\`\`\`

> 📝 **注意**: 以上仅为示例模型，更多可用模型请在 Cursor 客户端中查看当前支持的完整模型列表。

### 第五步：开始使用

在你的项目目录中运行：

\`\`\`bash
ccr code
\`\`\`

这个命令会：
1. 🚀 启动本地 API 服务器 (\`http://localhost:3456\`)
2. 🔄 运行 \`claude\` 命令并设置环境变量指向本地服务器
3. 🎉 享受免费的 Claude Code 体验！

## 🎯 支持的模型

通过我们的接口，你可以使用 Cursor 中提供的所有模型。以下是一些常见模型示例：

| 模型 | 描述 | 推荐用途 |
|------|------|----------|
| **claude-4-sonnet** | 最新最强的代码生成能力 | 复杂编程任务、架构设计 |
| **claude-3.7-sonnet** | 增强版本，性能优秀 | 高级编程任务 |
| **claude-3.5-sonnet** | 经典强力模型 | 通用编程任务 |
| **gemini-2.5-pro** | Google 最新模型 | 长上下文处理 |
| **gpt-4.1** | OpenAI 改进版本 | 通用任务 |
| **gpt-4o-mini** | 轻量级高效模型 | 后台任务、快速响应 |

> 🔍 **获取完整模型列表**: 请在 Cursor 客户端中查看当前支持的所有可用模型，模型可用性可能会根据你的订阅计划而有所不同。

## 💡 使用技巧

### 1. 合理配置模型路由
- **\`background\`**: 用于后台任务，建议用轻量模型如 \`gpt-4o-mini\`
- **\`think\`**: 用于复杂思考，建议用强力模型如 \`claude-4-sonnet\`
- **\`longContext\`**: 用于长上下文处理，建议用 \`gemini-2.5-pro\`

### 2. Token 管理
- Cursor session token 有有效期限制（通常几天到几周）
- 如果遇到认证失败，重新获取 session token 即可
- 建议定期更新 token 以确保服务稳定

### 3. 网络配置
- 确保能正常访问 \`lujiangc.com\`
- 如有网络问题，检查防火墙设置
- 支持代理环境，按需配置

## 🔧 故障排除

### 常见错误及解决方案

**❌ 错误：认证失败 (401 Unauthorized)**
- ✅ 检查 Cursor session token 是否正确
- ✅ 确认 token 未过期，重新获取
- ✅ 验证 authorization header 格式正确

**❌ 错误：网络连接失败**  
- ✅ 检查网络连接状态
- ✅ 确认 API 端点地址正确
- ✅ 尝试使用 curl 测试连接

**❌ 错误：模型不支持**
- ✅ 检查配置文件中的模型名称是否正确
- ✅ 参考上面的支持模型列表
- ✅ 确认 Cursor 账号有对应模型的访问权限
- ✅ 在 Cursor 客户端中验证模型可用性

**❌ 错误：配置文件问题**
- ✅ 检查 JSON 格式是否正确
- ✅ 确认配置文件路径是否正确（参考上面的路径表格）
- ✅ 验证所有必需字段都已填写

**❌ 错误：Windows 路径问题**
- ✅ 确保使用正确的 Windows 路径格式
- ✅ 检查用户名是否包含特殊字符
- ✅ 尝试使用绝对路径而非环境变量

## 🛠️ 高级配置

### 自定义端口
如果 3456 端口被占用，可以指定其他端口：

\`\`\`bash
ccr code --port 3457
\`\`\`

### 日志配置
开启详细日志以便调试：

\`\`\`json
{
  "log": true,
  "logLevel": "debug",
  // ... 其他配置
}
\`\`\`

### 多提供商配置
可以配置多个 API 提供商：

\`\`\`json
{
  "Providers": [
    {
      "name": "cursor-proxy",
      "api_base_url": "https://lujiangc.com/api/cursor2openai/v1",
      "api_key": "your-cursor-token"
    },
    {
      "name": "openai-direct",
      "api_base_url": "https://api.openai.com/v1",
      "api_key": "your-openai-key"
    }
  ]
}
\`\`\`

### 动态切换模型
在 Claude Code 中可以使用命令动态切换模型：

\`\`\`bash
/model cursor-proxy,claude-4-sonnet
/model cursor-proxy,gemini-2.5-pro
\`\`\`

## 📚 相关资源

- [Claude Code 官方文档](https://docs.anthropic.com/claude/docs/claude-code)
- [Claude Code Router 项目](https://github.com/musistudio/claude-code-router)
- [原理解析博客](https://egoist.dev/claude-code-free)
- [Cursor 官方网站](https://cursor.com)

## 🤝 贡献与反馈

如果你在使用过程中遇到问题或有改进建议，欢迎：

- 查阅上述故障排除指南
- 参考相关技术文档
- 通过社区渠道交流讨论

## ⚖️ 免责声明

<div style="background: #f8f9fa; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0; border-radius: 4px;">
<strong>重要提醒：</strong>

1. **仅供学习研究**：本项目及相关接口仅用于技术学习和研究目的
2. **禁止商业使用**：严禁将此方案用于任何商业用途或盈利活动  
3. **用户责任**：使用者需自行承担使用风险，遵守相关服务条款
4. **技术教育**：我们鼓励通过此项目学习 API 转换和代理技术
5. **版权尊重**：请尊重 Cursor 和 Anthropic 的服务条款和知识产权
</div>

---

**祝你使用愉快！** 🎉

*本指南最后更新：2025年6月*
`;

export default function Cursor2ClaudePage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <MarkdownRenderer content={markdownContent} />
    </div>
  );
}
