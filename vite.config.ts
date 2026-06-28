import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Vite 是本项目第一阶段的开发服务器和生产构建工具。
// 配置保持克制：React 插件负责 TSX/JSX 转译，Vitest 负责浏览器近似环境下的组件测试。
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setupTests.ts',
  },
});
