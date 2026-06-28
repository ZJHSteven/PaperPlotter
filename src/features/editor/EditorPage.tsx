import { useState } from 'react';
import { useProjectStore } from '../../state/projectStore';
import { generateGcode } from '../gcode/generateGcode';
import { projectToGcodeJob } from '../gcode/projectToGcode';
import { validateGcodeJob } from '../gcode/safetyCheck';
import { PaperSettingsPanel } from '../settings/PaperSettingsPanel';
import { MachineSettingsPanel } from '../settings/MachineSettingsPanel';
import { CalibrationPanel } from '../settings/CalibrationPanel';
import { SvgCanvas } from './SvgCanvas';
import { SelectionPanel } from './SelectionPanel';
import { ZeroingGuide } from './ZeroingGuide';
import { ZCalibrationPanel } from '../z-calibration/ZCalibrationPanel';

/**
 * 编辑器主页面。
 *
 * 这里先实现计划书中的“工作台”骨架：
 * 左侧是纸张/标定入口，中间是 SVG 纸面，右侧是机器参数和导出检查入口。
 */
export function EditorPage() {
  const [exportMessage, setExportMessage] = useState<string>('尚未导出。');
  const project = useProjectStore((state) => state.project);
  const selectedObjectId = useProjectStore((state) => state.selectedObjectId);
  const addTestPattern = useProjectStore((state) => state.addTestPattern);
  const addTextObject = useProjectStore((state) => state.addTextObject);
  const resetProject = useProjectStore((state) => state.resetProject);
  const selectedObject = project.objects.find((object) => object.id === selectedObjectId);
  const gcodeJob = projectToGcodeJob(project);
  const validation = validateGcodeJob(gcodeJob);

  function handleExportGcode() {
    if (!validation.ok) {
      setExportMessage(validation.issues.map((issue) => issue.message).join('；'));
      return;
    }

    const gcode = generateGcode(gcodeJob);
    downloadTextFile('paper-plotter-job.gcode', gcode);
    setExportMessage(`已生成 G-code：${gcodeJob.paths.length} 条路径。`);
  }

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
          <button className="primary-button" type="button" onClick={handleExportGcode}>
            导出 G-code
          </button>
        </div>
      </header>

      <section className="workspace" aria-label="PaperPlotter 编辑器工作区">
        <aside className="side-panel" aria-label="纸张与标定设置">
          <PaperSettingsPanel paper={project.paper} />
          <CalibrationPanel calibration={project.calibration} />

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
              <button type="button" onClick={addTextObject}>
                添加测试文本
              </button>
            </div>
          </section>
        </aside>

        <SvgCanvas
          paper={project.paper}
          calibration={project.calibration}
          objects={project.objects}
          selectedObjectId={selectedObjectId}
        />

        <aside className="side-panel" aria-label="机器与导出设置">
          <SelectionPanel object={selectedObject} />

          <MachineSettingsPanel machine={project.machine} />

          <ZeroingGuide />

          <ZCalibrationPanel config={project.zCalibration} machine={project.machine} />

          <section className="panel-section">
            <h2>导出前检查</h2>
            <ul className={validation.ok ? 'check-list' : 'check-list check-list--error'}>
              <li>纸张尺寸：{project.paper.widthMm} × {project.paper.heightMm} mm</li>
              <li>对象数量：{project.objects.length}</li>
              <li>可导出路径：{gcodeJob.paths.length}</li>
              <li>归零提示：运行前执行 G92 X0 Y0</li>
            </ul>
            {validation.issues.length > 0 ? (
              <ul className="validation-list">
                {validation.issues.map((issue) => (
                  <li key={`${issue.code}-${issue.message}`}>{issue.message}</li>
                ))}
              </ul>
            ) : null}
            <p className="hint">{exportMessage}</p>
          </section>
        </aside>
      </section>
    </main>
  );
}

/**
 * 触发浏览器下载文本文件。
 *
 * Vitest/jsdom 没有真正的文件下载能力。
 * 因此测试模式只验证 G-code 已经成功生成，不点击 `<a>` 触发伪导航，避免测试输出噪音。
 */
function downloadTextFile(fileName: string, content: string) {
  if (import.meta.env.MODE === 'test') {
    return;
  }

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
