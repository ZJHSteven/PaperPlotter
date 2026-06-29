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

export type EditorTool = 'select' | 'pan' | 'paper-corners' | 'machine-axis';
type RightPanelTab = 'object' | 'machine' | 'z' | 'export';

/**
 * 编辑器主页面。
 *
 * 页面现在按“工具型桌面软件”组织：
 * 顶栏放项目级命令和工具模式，底栏放状态信息，中间三列在一个视口内等高。
 * 这样用户标定纸张时，视线主要停留在画布和当前步骤，不需要在长页面里上下滚动找按钮。
 */
export function EditorPage() {
  const [exportMessage, setExportMessage] = useState<string>('尚未导出。');
  const [activeTool, setActiveTool] = useState<EditorTool>('select');
  const [rightTab, setRightTab] = useState<RightPanelTab>('object');
  const project = useProjectStore((state) => state.project);
  const selectedObjectId = useProjectStore((state) => state.selectedObjectId);
  const addTestPattern = useProjectStore((state) => state.addTestPattern);
  const addTextObject = useProjectStore((state) => state.addTextObject);
  const addChineseSampleTextObject = useProjectStore((state) => state.addChineseSampleTextObject);
  const resetProject = useProjectStore((state) => state.resetProject);
  const selectedObject = project.objects.find((object) => object.id === selectedObjectId);
  const gcodeJob = projectToGcodeJob(project);
  const validation = validateGcodeJob(gcodeJob);
  const machineAxisDone = Boolean(project.calibration.machineAxisLinePx);

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
      <header className="app-toolbar">
        <div className="brand-block" aria-label="项目标题">
          <span className="brand-mark">P</span>
          <div>
            <p className="eyebrow">PaperPlotter</p>
            <h1>写字机纸面排版与 G-code 生成工具</h1>
          </div>
        </div>

        <div className="tool-strip" aria-label="编辑工具栏">
          <ToolButton active={activeTool === 'select'} label="选择" onClick={() => setActiveTool('select')} />
          <ToolButton active={activeTool === 'pan'} label="移动" onClick={() => setActiveTool('pan')} />
          <ToolButton
            active={activeTool === 'paper-corners'}
            label="纸角"
            onClick={() => setActiveTool('paper-corners')}
          />
          <ToolButton
            active={activeTool === 'machine-axis'}
            disabled={!project.calibration.result}
            label="参考线"
            onClick={() => setActiveTool('machine-axis')}
          />
        </div>

        <div className="top-bar__actions">
          <span className="status-pill">已保存</span>
          <button className="secondary-button" type="button" onClick={resetProject}>
            重置
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
              <button type="button" onClick={addChineseSampleTextObject}>
                添加中文示例
              </button>
            </div>
          </section>
        </aside>

        <SvgCanvas
          activeTool={activeTool}
          paper={project.paper}
          calibration={project.calibration}
          objects={project.objects}
          selectedObjectId={selectedObjectId}
        />

        <aside className="side-panel" aria-label="机器与导出设置">
          <div className="side-tabs" aria-label="右侧属性页">
            <TabButton active={rightTab === 'object'} label="对象" onClick={() => setRightTab('object')} />
            <TabButton active={rightTab === 'machine'} label="机器" onClick={() => setRightTab('machine')} />
            <TabButton active={rightTab === 'z'} label="Z 标定" onClick={() => setRightTab('z')} />
            <TabButton active={rightTab === 'export'} label="导出" onClick={() => setRightTab('export')} />
          </div>

          {rightTab === 'object' ? <SelectionPanel object={selectedObject} /> : null}
          {rightTab === 'machine' ? <MachineSettingsPanel machine={project.machine} /> : null}
          {rightTab === 'z' ? <ZCalibrationPanel config={project.zCalibration} machine={project.machine} /> : null}
          {rightTab === 'export' ? (
            <>
              <ZeroingGuide />
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
            </>
          ) : null}
        </aside>
      </section>

      <footer className="status-bar" aria-label="底部状态栏">
        <span>工具：{getToolLabel(activeTool)}</span>
        <span>纸张：{project.paper.widthMm} × {project.paper.heightMm} mm</span>
        <span>纸角：{project.calibration.result ? '已标定' : '未完成'}</span>
        <span>参考线：{machineAxisDone ? '已标定' : '未完成'}</span>
        <span>对象：{project.objects.length}</span>
        <span>路径：{gcodeJob.paths.length}</span>
      </footer>
    </main>
  );
}

function ToolButton({
  active,
  disabled,
  label,
  onClick,
}: {
  active: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={active ? 'tool-button tool-button--active' : 'tool-button'}
      disabled={disabled}
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button className={active ? 'tab-button tab-button--active' : 'tab-button'} type="button" onClick={onClick}>
      {label}
    </button>
  );
}

function getToolLabel(tool: EditorTool) {
  if (tool === 'pan') {
    return '移动';
  }

  if (tool === 'paper-corners') {
    return '纸角标定';
  }

  if (tool === 'machine-axis') {
    return '机器参考线';
  }

  return '选择';
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
