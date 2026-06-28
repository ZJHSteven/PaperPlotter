import { useProjectStore } from '../../state/projectStore';
import { PaperSettingsPanel } from '../settings/PaperSettingsPanel';
import { MachineSettingsPanel } from '../settings/MachineSettingsPanel';
import { SvgCanvas } from './SvgCanvas';
import { SelectionPanel } from './SelectionPanel';

/**
 * 编辑器主页面。
 *
 * 这里先实现计划书中的“工作台”骨架：
 * 左侧是纸张/标定入口，中间是 SVG 纸面，右侧是机器参数和导出检查入口。
 */
export function EditorPage() {
  const project = useProjectStore((state) => state.project);
  const selectedObjectId = useProjectStore((state) => state.selectedObjectId);
  const addTestPattern = useProjectStore((state) => state.addTestPattern);
  const resetProject = useProjectStore((state) => state.resetProject);
  const selectedObject = project.objects.find((object) => object.id === selectedObjectId);

  return (
    <main className="app-shell">
      <header className="top-bar">
        <div>
          <p className="eyebrow">PaperPlotter MVP</p>
          <h1>写字机纸面排版与 G-code 生成工具</h1>
        </div>
        <div className="top-bar__actions">
          <span className="status-pill">本地自动保存</span>
          <button className="secondary-button" type="button" onClick={resetProject}>
            重置项目
          </button>
          <button className="primary-button" type="button">
            导出 G-code
          </button>
        </div>
      </header>

      <section className="workspace" aria-label="PaperPlotter 编辑器工作区">
        <aside className="side-panel" aria-label="纸张与标定设置">
          <PaperSettingsPanel paper={project.paper} />

          <section className="panel-section">
            <h2>标定流程</h2>
            <ol className="step-list">
              <li>导入纸张照片</li>
              <li>依次点选四个纸角</li>
              <li>点选机器 X/Y 参考线</li>
              <li>手动移动笔头到纸张左上角</li>
              <li>在外部 sender 执行 G92 X0 Y0</li>
            </ol>
          </section>

          <section className="panel-section">
            <h2>测试图案</h2>
            <div className="button-grid">
              <button type="button" onClick={() => addTestPattern('rectangle')}>
                添加 20mm 方框
              </button>
              <button type="button" onClick={() => addTestPattern('cross')}>
                添加十字
              </button>
            </div>
          </section>
        </aside>

        <SvgCanvas paper={project.paper} objects={project.objects} selectedObjectId={selectedObjectId} />

        <aside className="side-panel" aria-label="机器与导出设置">
          <SelectionPanel object={selectedObject} />

          <MachineSettingsPanel machine={project.machine} />

          <section className="panel-section">
            <h2>导出前检查</h2>
            <ul className="check-list">
              <li>纸张尺寸：{project.paper.widthMm} × {project.paper.heightMm} mm</li>
              <li>对象数量：{project.objects.length}</li>
              <li>归零提示：运行前执行 G92 X0 Y0</li>
            </ul>
          </section>
        </aside>
      </section>
    </main>
  );
}
