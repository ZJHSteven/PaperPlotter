import { useState } from 'react';
import { useProjectStore } from '../../state/projectStore';
import type { MachineConfig, ZCalibrationConfig } from '../../types/project';
import { useSerialStore } from '../serial/serialStore';
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
  const serial = useSerialStore();
  const webSerialSupported = serial.status !== 'unsupported';

  function sendCurrentGcodeToSerial() {
    if (!gcode.trim()) {
      return;
    }

    void serial.writeText(gcode);
  }

  function connectSelectedSerialPort() {
    if (!serial.selectedPortId) {
      void serial.requestPortAndSelect().then(() => {
        void useSerialStore.getState().connectSelectedPort();
      });
      return;
    }

    void serial.connectSelectedPort();
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
          <NumberField label="串口波特率" min={1} value={serial.baudRate} onChange={serial.setBaudRate} />
          <label className="field">
            <span>已授权串口</span>
            <select
              disabled={!webSerialSupported}
              value={serial.selectedPortId ?? ''}
              onChange={(event) => serial.selectPort(event.target.value)}
            >
              <option value="">未选择端口</option>
              {serial.ports.map((port) => (
                <option key={port.id} value={port.id}>
                  {port.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="field">
          <span>串口状态</span>
          <input readOnly value={serial.statusMessage} />
        </label>
        <div className="button-grid">
          <button disabled={!webSerialSupported} type="button" onClick={() => void serial.refreshAuthorizedPorts()}>
            刷新已授权端口
          </button>
          <button disabled={!webSerialSupported} type="button" onClick={() => void serial.requestPortAndSelect()}>
            选择新端口
          </button>
          <button disabled={!webSerialSupported || serial.status === 'connecting'} type="button" onClick={connectSelectedSerialPort}>
            连接
          </button>
          <button disabled={!webSerialSupported || !gcode.trim()} type="button" onClick={sendCurrentGcodeToSerial}>
            发送当前 Z G-code
          </button>
          <button disabled={!webSerialSupported} type="button" onClick={() => void serial.disconnect()}>
            断开串口
          </button>
        </div>
        <p className="hint">
          Web Serial 只用于 Z 标定实机验证；如果浏览器不支持或发送器已占用串口，请继续复制上方 G-code 到外部 sender。
        </p>
        {serial.log.length > 0 ? (
          <ul className="serial-log" aria-label="串口发送日志">
            {serial.log.map((line) => (
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
