import { useEffect, useState } from 'react';
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
import { loadCalibrationImageBlob } from '../storage/imageStorage';
import { useSerialStore } from '../serial/serialStore';
import type { DesignObject } from '../../types/project';

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
  const [canvasHotkeysActive, setCanvasHotkeysActive] = useState(false);
  const [savedAt, setSavedAt] = useState(new Date());
  const project = useProjectStore((state) => state.project);
  const history = useProjectStore((state) => state.history);
  const selectedObjectId = useProjectStore((state) => state.selectedObjectId);
  const addTestPattern = useProjectStore((state) => state.addTestPattern);
  const addTextObject = useProjectStore((state) => state.addTextObject);
  const addChineseSampleTextObject = useProjectStore((state) => state.addChineseSampleTextObject);
  const resetProject = useProjectStore((state) => state.resetProject);
  const undo = useProjectStore((state) => state.undo);
  const redo = useProjectStore((state) => state.redo);
  const restoreCalibrationImageUrl = useProjectStore((state) => state.restoreCalibrationImageUrl);
  const setCalibrationError = useProjectStore((state) => state.setCalibrationError);
  const serialStatus = useSerialStore((state) => state.status);
  const serialStatusMessage = useSerialStore((state) => state.statusMessage);
  const selectedObject = project.objects.find((object) => object.id === selectedObjectId);
  const gcodeJob = projectToGcodeJob(project);
  const validation = validateGcodeJob(gcodeJob);
  const machineAxisDone = Boolean(project.calibration.machineAxisLinePx);
  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  useEffect(() => {
    setSavedAt(new Date());
  }, [project]);

  useEffect(() => {
    function handleKeyboardShortcut(event: KeyboardEvent) {
      const target = event.target;
      const tagName = target instanceof HTMLElement ? target.tagName.toLowerCase() : '';
      const isEditableTarget =
        tagName === 'input' ||
        tagName === 'textarea' ||
        tagName === 'select' ||
        (target instanceof HTMLElement && target.isContentEditable);

      if (!canvasHotkeysActive || isEditableTarget || !(event.ctrlKey || event.metaKey)) {
        return;
      }

      if (event.key.toLowerCase() === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
        return;
      }

      if (event.key.toLowerCase() === 'y' || (event.key.toLowerCase() === 'z' && event.shiftKey)) {
        event.preventDefault();
        redo();
      }
    }

    window.addEventListener('keydown', handleKeyboardShortcut);

    return () => {
      window.removeEventListener('keydown', handleKeyboardShortcut);
    };
  }, [canvasHotkeysActive, redo, undo]);

  useEffect(() => {
    let objectUrl: string | undefined;
    let cancelled = false;

    if (!project.calibration.imageId || project.calibration.imageUrl) {
      return undefined;
    }

    loadCalibrationImageBlob(project.calibration.imageId)
      .then((record) => {
        if (cancelled) {
          return;
        }

        if (!record) {
          setCalibrationError('浏览器本地图片记录不存在，请重新导入纸张照片。');
          return;
        }

        objectUrl = URL.createObjectURL(record.blob);
        restoreCalibrationImageUrl(objectUrl);
      })
      .catch((error) => {
        if (!cancelled) {
          setCalibrationError(error instanceof Error ? error.message : '读取纸张照片失败。');
        }
      });

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [
    project.calibration.imageId,
    project.calibration.imageUrl,
    restoreCalibrationImageUrl,
    setCalibrationError,
  ]);

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
      <h1 className="sr-only">写字机纸面排版与 G-code 生成工具</h1>
      <header className="app-toolbar">
        <div className="brand-block" aria-label="项目标题">
          <span className="brand-mark" aria-hidden="true">
            <Icon name="app" />
          </span>
          <strong>PaperPlotter</strong>
          <button className="project-button" type="button">
            <Icon name="folder" /> 项目
          </button>
          <span className="project-name">示例项目_A4_练字帖</span>
          <span className="save-indicator">● 已保存 {formatTime(savedAt)}</span>
        </div>

        <div className="toolbar-group toolbar-group--history" aria-label="撤销重做">
          <IconButton disabled={!canUndo} label="撤销" name="undo" onClick={undo} />
          <IconButton disabled={!canRedo} label="重做" name="redo" onClick={redo} />
        </div>

        <div className="tool-strip" aria-label="编辑工具栏">
          <ToolButton active={activeTool === 'select'} icon="cursor" label="选择" onClick={() => setActiveTool('select')} />
          <ToolButton active={activeTool === 'pan'} icon="move" label="移动" onClick={() => setActiveTool('pan')} />
          <ToolButton active={false} icon="zoom" label="缩放" onClick={() => setActiveTool('select')} />
          <ToolButton active={false} icon="pen" label="绘制" onClick={() => addTestPattern('rectangle')} />
          <ToolButton active={false} icon="text" label="文字" onClick={addTextObject} />
          <ToolButton active={rightTab === 'object'} icon="layers" label="图层" onClick={() => setRightTab('object')} />
          <ToolButton
            active={activeTool === 'paper-corners'}
            icon="corner"
            label="纸角"
            onClick={() => setActiveTool('paper-corners')}
          />
          <ToolButton
            active={activeTool === 'machine-axis'}
            disabled={!project.calibration.result}
            icon="axis"
            label="参考线"
            onClick={() => setActiveTool('machine-axis')}
          />
        </div>

        <div className="top-bar__actions">
          <label className="unit-select">
            <span>单位</span>
            <select value="mm" onChange={() => undefined}>
              <option value="mm">mm</option>
            </select>
          </label>
          <button className="settings-button" type="button" onClick={() => setRightTab('machine')}>
            <Icon name="settings" /> 设置
          </button>
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
          <ZeroingGuide />

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
          onHotkeyScopeChange={setCanvasHotkeysActive}
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
        <span>机器连接：{serialStatus === 'connected' ? serialStatusMessage : getSerialShortStatus(serialStatus)}</span>
        <span>固件：GRBL 1.1h</span>
        <span>状态：空闲</span>
        <span>选中对象：{selectedObject ? getObjectStatusLabel(selectedObject) : '无'}</span>
        <span>工具：{getToolLabel(activeTool)}</span>
        <span>纸张：{project.paper.widthMm} × {project.paper.heightMm} mm</span>
        <span>纸角：{project.calibration.result ? '已标定' : '未完成'}</span>
        <span>参考线：{machineAxisDone ? '已标定' : '未完成'}</span>
        <span>路径：{gcodeJob.paths.length}</span>
      </footer>
    </main>
  );
}

function ToolButton({
  active,
  disabled,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  disabled?: boolean;
  icon: IconName;
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
      <Icon name={icon} />
      <span>{label}</span>
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

type IconName =
  | 'app'
  | 'axis'
  | 'corner'
  | 'cursor'
  | 'folder'
  | 'layers'
  | 'move'
  | 'pen'
  | 'redo'
  | 'settings'
  | 'text'
  | 'undo'
  | 'zoom';

function IconButton({
  disabled,
  label,
  name,
  onClick,
}: {
  disabled?: boolean;
  label: string;
  name: IconName;
  onClick: () => void;
}) {
  return (
    <button className="icon-button" disabled={disabled} type="button" aria-label={label} title={label} onClick={onClick}>
      <Icon name={name} />
      <span>{label}</span>
    </button>
  );
}

function Icon({ name }: { name: IconName }) {
  const commonProps = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  if (name === 'app') {
    return (
      <svg {...commonProps}>
        <path d="M4 4h12v4" />
        <path d="M4 4v16h16v-8" />
        <path d="M14 4l6-2-2 6" />
        <path d="M9 15l9-9" />
      </svg>
    );
  }

  if (name === 'folder') {
    return (
      <svg {...commonProps}>
        <path d="M3 7h7l2 2h9v10H3z" />
        <path d="M3 7v12" />
      </svg>
    );
  }

  if (name === 'undo' || name === 'redo') {
    return (
      <svg {...commonProps}>
        <path d={name === 'undo' ? 'M9 7H4v5' : 'M15 7h5v5'} />
        <path d={name === 'undo' ? 'M4 12a8 8 0 1 0 3-6' : 'M20 12a8 8 0 1 1-3-6'} />
      </svg>
    );
  }

  if (name === 'cursor') {
    return (
      <svg {...commonProps}>
        <path d="M5 3l11 9-5 1-3 5z" />
      </svg>
    );
  }

  if (name === 'move') {
    return (
      <svg {...commonProps}>
        <path d="M12 2v20" />
        <path d="M2 12h20" />
        <path d="M12 2l3 3" />
        <path d="M12 2L9 5" />
        <path d="M12 22l3-3" />
        <path d="M12 22l-3-3" />
        <path d="M2 12l3 3" />
        <path d="M2 12l3-3" />
        <path d="M22 12l-3 3" />
        <path d="M22 12l-3-3" />
      </svg>
    );
  }

  if (name === 'zoom') {
    return (
      <svg {...commonProps}>
        <circle cx="10" cy="10" r="6" />
        <path d="M15 15l5 5" />
        <path d="M10 7v6" />
        <path d="M7 10h6" />
      </svg>
    );
  }

  if (name === 'pen' || name === 'corner') {
    return (
      <svg {...commonProps}>
        <path d="M4 20l4-1 10-10-3-3L5 16z" />
        <path d="M13 6l3 3" />
      </svg>
    );
  }

  if (name === 'text') {
    return (
      <svg {...commonProps}>
        <path d="M4 6h16" />
        <path d="M12 6v12" />
        <path d="M8 18h8" />
      </svg>
    );
  }

  if (name === 'layers') {
    return (
      <svg {...commonProps}>
        <path d="M12 3l9 5-9 5-9-5z" />
        <path d="M3 12l9 5 9-5" />
        <path d="M3 16l9 5 9-5" />
      </svg>
    );
  }

  if (name === 'axis') {
    return (
      <svg {...commonProps}>
        <path d="M4 18h16" />
        <path d="M6 16l-2 2 2 2" />
        <path d="M18 16l2 2-2 2" />
        <path d="M12 18V6" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3" />
      <path d="M12 19v3" />
      <path d="M2 12h3" />
      <path d="M19 12h3" />
      <path d="M4.9 4.9l2.1 2.1" />
      <path d="M17 17l2.1 2.1" />
      <path d="M19.1 4.9 17 7" />
      <path d="M7 17l-2.1 2.1" />
    </svg>
  );
}

function formatTime(date: Date) {
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function getSerialShortStatus(status: string) {
  if (status === 'unsupported') {
    return '不支持 Web Serial';
  }

  if (status === 'connecting') {
    return '连接中';
  }

  if (status === 'error') {
    return '异常';
  }

  return '未连接';
}

function getObjectStatusLabel(object: DesignObject) {
  if (!object) {
    return '无';
  }

  if (object.type === 'text') {
    return `文本：${object.text}`;
  }

  if (object.type === 'test-pattern') {
    return object.kind === 'rectangle' ? '纸张边框' : object.kind;
  }

  return '路径对象';
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
