import { useRef, useState } from 'react';
import { useProjectStore } from '../../state/projectStore';
import type { MachineConfig, ZCalibrationConfig } from '../../types/project';
import {
  isWebSerialSupported,
  requestWebSerialConnection,
  type WebSerialConnection,
} from '../serial/webSerial';
import {
  generateCoarseDotProbeGcode,
  generateFineLineScanGcode,
  stepZTowardPaper,
  type FineScanPlan,
} from './zCalibrationGcode';

type ZCalibrationPanelProps = {
  config: ZCalibrationConfig;
  machine: MachineConfig;
};

/**
 * Z 单点标定向导。
 *
 * 面板保留“复制 G-code 到外部 sender”的后备流程，同时提供 Web Serial 的最小闭环。
 * Web Serial 只负责把当前 Z 标定 G-code 发给用户手动选择的串口，不替代完整 sender。
 */
export function ZCalibrationPanel({ config, machine }: ZCalibrationPanelProps) {
  const updateZCalibrationConfig = useProjectStore((state) => state.updateZCalibrationConfig);
  const saveBasePenDownZ = useProjectStore((state) => state.saveBasePenDownZ);
  const [testPoint, setTestPoint] = useState({ x: 20, y: 20 });
  const [currentZ, setCurrentZ] = useState(machine.penDownZ);
  const [contactApproxZ, setContactApproxZ] = useState<number>();
  const [finePlan, setFinePlan] = useState<FineScanPlan>();
  const [gcode, setGcode] = useState('');
  const [baudRate, setBaudRate] = useState(115200);
  const [serialStatus, setSerialStatus] = useState(
    isWebSerialSupported() ? '未连接串口。' : '当前浏览器不支持 Web Serial，请使用外部 sender。',
  );
  const [serialLog, setSerialLog] = useState<string[]>([]);
  const serialConnectionRef = useRef<WebSerialConnection | null>(null);
  const webSerialSupported = isWebSerialSupported();

  async function connectSerial() {
    try {
      serialConnectionRef.current = await requestWebSerialConnection(baudRate);
      setSerialStatus(`串口已连接，波特率 ${baudRate}。`);
      appendSerialLog('已连接串口。');
    } catch (error) {
      setSerialStatus(error instanceof Error ? error.message : '连接串口失败。');
    }
  }

  async function disconnectSerial() {
    try {
      await serialConnectionRef.current?.close();
      serialConnectionRef.current = null;
      setSerialStatus('串口已断开。');
      appendSerialLog('已断开串口。');
    } catch (error) {
      setSerialStatus(error instanceof Error ? error.message : '断开串口失败。');
    }
  }

  async function sendCurrentGcodeToSerial() {
    if (!gcode.trim()) {
      setSerialStatus('请先生成 Z 标定 G-code，再发送到串口。');
      return;
    }

    if (!serialConnectionRef.current) {
      setSerialStatus('请先连接串口。');
      return;
    }

    try {
      await serialConnectionRef.current.writeText(gcode.endsWith('\n') ? gcode : `${gcode}\n`);
      appendSerialLog(`已发送 ${gcode.split('\n').filter(Boolean).length} 行 Z 标定 G-code。`);
      setSerialStatus('当前 Z 标定 G-code 已发送。');
    } catch (error) {
      setSerialStatus(error instanceof Error ? error.message : '发送 G-code 失败。');
    }
  }

  function appendSerialLog(message: string) {
    setSerialLog((current) => [`${new Date().toLocaleTimeString()} ${message}`, ...current].slice(0, 6));
  }

  function generateNextDot() {
    const nextZ = stepZTowardPaper(currentZ, config);
    setCurrentZ(nextZ);
    setGcode(generateCoarseDotProbeGcode(testPoint, nextZ, config, machine));
  }

  function enterFineScan() {
    const nextPlan = generateFineLineScanGcode(
      {
        xMm: testPoint.x,
        yMm: testPoint.y + 8,
        widthMm: config.testLineLengthMm,
        heightMm: config.testLineSpacingMm * Math.max(1, config.testLineCount - 1),
      },
      currentZ,
      config,
      machine,
    );

    setContactApproxZ(currentZ);
    setFinePlan(nextPlan);
    setGcode(nextPlan.gcode);
  }

  return (
    <section className="panel-section">
      <h2>Z 单点标定</h2>

      <div className="field-grid">
        <label className="field">
          <span>Z 轴正方向</span>
          <select
            value={config.zPositiveDirection}
            onChange={(event) =>
              updateZCalibrationConfig({
                zPositiveDirection: event.target.value as ZCalibrationConfig['zPositiveDirection'],
              })
            }
          >
            <option value="up">向上为正</option>
            <option value="down">向下为正</option>
          </select>
        </label>
        <NumberField
          label="最大下降范围 mm"
          min={0}
          value={config.maxProbeDistanceMm}
          onChange={(value) => updateZCalibrationConfig({ maxProbeDistanceMm: value })}
        />
      </div>

      <div className="field-grid">
        <NumberField
          label="粗找步长 mm"
          min={0}
          value={config.coarseStepMm}
          onChange={(value) => updateZCalibrationConfig({ coarseStepMm: value })}
        />
        <NumberField
          label="细调步长 mm"
          min={0}
          value={config.fineStepMm}
          onChange={(value) => updateZCalibrationConfig({ fineStepMm: value })}
        />
      </div>

      <div className="field-grid">
        <NumberField
          label="细调线数量"
          min={3}
          max={4}
          value={config.testLineCount}
          onChange={(value) => updateZCalibrationConfig({ testLineCount: value })}
        />
        <NumberField
          label="测试线长度 mm"
          min={0}
          value={config.testLineLengthMm}
          onChange={(value) => updateZCalibrationConfig({ testLineLengthMm: value })}
        />
      </div>

      <div className="field-grid">
        <NumberField
          label="测试线间距 mm"
          min={0}
          value={config.testLineSpacingMm}
          onChange={(value) => updateZCalibrationConfig({ testLineSpacingMm: value })}
        />
        <NumberField
          label="测试速度"
          min={0}
          value={config.testDrawFeedRate}
          onChange={(value) => updateZCalibrationConfig({ testDrawFeedRate: value })}
        />
      </div>

      <NumberField
        label="Z 轴移动速度"
        min={0}
        value={config.zFeedRate}
        onChange={(value) => updateZCalibrationConfig({ zFeedRate: value })}
      />

      <div className="field-grid">
        <NumberField label="测试点 X" value={testPoint.x} onChange={(value) => setTestPoint({ ...testPoint, x: value })} />
        <NumberField label="测试点 Y" value={testPoint.y} onChange={(value) => setTestPoint({ ...testPoint, y: value })} />
      </div>

      <div className="field-grid">
        <NumberField label="当前 Z" value={currentZ} onChange={setCurrentZ} />
        <label className="field">
          <span>已保存落笔 Z</span>
          <input readOnly value={config.basePenDownZ ?? '未保存'} />
        </label>
      </div>

      <div className="button-grid">
        <button type="button" onClick={generateNextDot}>
          下降一步并点一下
        </button>
        <button type="button" onClick={enterFineScan}>
          看到墨点，进入细调
        </button>
      </div>

      {contactApproxZ !== undefined ? (
        <p className="hint">粗找接触高度：Z {contactApproxZ}</p>
      ) : null}

      {finePlan ? (
        <div className="candidate-grid">
          {finePlan.candidates.map((candidate) => (
            <button key={candidate.index} type="button" onClick={() => saveBasePenDownZ(candidate.z)}>
              选第 {candidate.index} 条：Z {candidate.z}
            </button>
          ))}
        </div>
      ) : null}

      <label className="field">
        <span>当前 Z 标定 G-code</span>
        <textarea readOnly rows={8} value={gcode || '点击上方按钮生成测试 G-code。'} />
      </label>

      <div className="sub-panel">
        <h3>Web Serial 实机发送</h3>
        <div className="field-grid">
          <NumberField label="串口波特率" min={1} value={baudRate} onChange={setBaudRate} />
          <label className="field">
            <span>串口状态</span>
            <input readOnly value={serialStatus} />
          </label>
        </div>
        <div className="button-grid">
          <button disabled={!webSerialSupported} type="button" onClick={connectSerial}>
            连接串口
          </button>
          <button disabled={!webSerialSupported} type="button" onClick={sendCurrentGcodeToSerial}>
            发送当前 Z G-code
          </button>
          <button disabled={!webSerialSupported} type="button" onClick={disconnectSerial}>
            断开串口
          </button>
        </div>
        <p className="hint">
          Web Serial 只用于 Z 标定实机验证；如果浏览器不支持或发送器已占用串口，请继续复制上方 G-code 到外部 sender。
        </p>
        {serialLog.length > 0 ? (
          <ul className="serial-log" aria-label="串口发送日志">
            {serialLog.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

function NumberField({
  label,
  min,
  max,
  value,
  onChange,
}: {
  label: string;
  min?: number;
  max?: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        max={max}
        min={min}
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
