import { EditorPage } from '../features/editor/EditorPage';

/**
 * PaperPlotter 的应用根组件。
 *
 * 当前阶段只挂载编辑器页面，不引入路由。
 * 等后续出现“项目列表、设置独立页、导出历史”等真实需求时，再增加路由层。
 */
export function App() {
  return <EditorPage />;
}
