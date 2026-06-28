import { useState } from 'react';
import { useProjectStore } from '../../state/projectStore';
import type { MachineConfig, ZCalibrationConfig } from '../../types/project';
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
 * MVP 不连接串口，所以这里生成可复制的测试 G-code。
 * 用户用外部 sender 执行后，根据墨点/短线效果回到本界面继续下一步。
 */
export function ZCalibrationPanel({ config, machine }: ZCalibrationPanelProps) {
  const updateZCalibrationConfig = useProjectStore((state) => state.updateZCalibrationConfig);
  const saveBasePenDownZ = useProjectStore((state) => state.saveBasePenDownZ);
  const [testPoint, setTestPoint] = useState({ x: 20, y: 20 });
  const [currentZ, setCurrentZ] = useState(machine.penDownZ);
  const [contactApproxZ, setContactApproxZ] = useState<number>();
  const [finePlan, setFinePlan] = useState<FineScanPlan>();
  const [gcode, setGcode] = useState('');

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
