import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './styles.css';

// React 19 已经不再使用旧的 ReactDOM.render。
// createRoot 会把 React 应用挂载到 Vite 模板中的 #root 节点。
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('PaperPlotter 启动失败：页面缺少 id="root" 的挂载节点。');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
