/**
 * 自定义ESLint规则 - 检查API路由是否使用apiHandler
 */
module.exports = {
  rules: {
    'use-api-handler': {
      meta: {
        type: 'suggestion',
        docs: {
          description: 'API路由应使用apiHandler包装',
          category: 'Best Practices',
          recommended: true,
        },
        fixable: 'code',
        schema: [], // 无选项
      },
      create(context) {
        // 检查文件路径是否为API路由
        const isApiRoute =
          context.getFilename().includes('/app/api/') &&
          context.getFilename().endsWith('route.ts');

        if (!isApiRoute) return {};

        return {
          'Program:exit'(node) {
            const sourceCode = context.getSourceCode();
            const hasApiHandler = sourceCode.getText().includes('apiHandler');

            if (!hasApiHandler) {
              context.report({
                node,
                message: 'API路由应使用apiHandler包装函数以确保统一的响应格式',
              });
            }
          },
        };
      },
    },
  },
};
