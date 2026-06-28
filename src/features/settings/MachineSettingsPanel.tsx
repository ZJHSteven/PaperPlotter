import { useProjectStore } from '../../state/projectStore';
import type { MachineConfig } from '../../types/project';

type MachineSettingsPanelProps = {
  machine: MachineConfig;
};

/**
 * 机器参数面板。
 *
 * MVP 必须让速度、方向、Z 参数可配置。
 * 计划书要求所有速度、方向和 Z 参数都可配置。
 * 这些字段会直接影响 G-code 输出，所以保持在同一个面板中，方便导出前检查。
 */
export function MachineSettingsPanel({ machine }: MachineSettingsPanelProps) {
  const updateMachineConfig = useProjectStore((state) => state.updateMachineConfig);

  return (
    <section className="panel-section">
      <h2>机器</h2>

      <div className="field-grid">
        <NumberField
          label="工作区宽 mm"
          min={0}
          value={machine.workAreaWidthMm}
          onChange={(value) => updateMachineConfig({ workAreaWidthMm: value })}
        />
        <NumberField
          label="工作区高 mm"
          min={0}
          value={machine.workAreaHeightMm}
          onChange={(value) => updateMachineConfig({ workAreaHeightMm: value })}
        />
      </div>

      <div className="field-grid">
        <label className="field">
          <span>Y 轴方向</span>
          <select
            value={machine.yDirection}
            onChange={(event) =>
              updateMachineConfig({
                yDirection: event.target.value as MachineConfig['yDirection'],
              })
            }
          >
            <option value="same-as-paper-down">同纸面向下</option>
            <option value="opposite-paper-down">与纸面向下相反</option>
          </select>
        </label>
        <label className="field">
          <span>Z 轴正方向</span>
          <select
            value={machine.zPositiveDirection}
            onChange={(event) =>
              updateMachineConfig({
                zPositiveDirection: event.target.value as MachineConfig['zPositiveDirection'],
              })
            }
          >
            <option value="up">向上为正</option>
            <option value="down">向下为正</option>
          </select>
        </label>
      </div>

      <div className="field-grid">
        <NumberField
          label="空走速度"
          min={0}
          value={machine.travelFeedRate}
          onChange={(value) => updateMachineConfig({ travelFeedRate: value })}
        />
        <NumberField
          label="绘制速度"
          min={0}
          value={machine.drawFeedRate}
          onChange={(value) => updateMachineConfig({ drawFeedRate: value })}
        />
      </div>

      <div className="field-grid">
        <NumberField
          label="测试写字速度"
          min={0}
          value={machine.testDrawFeedRate}
          onChange={(value) => updateMachineConfig({ testDrawFeedRate: value })}
        />
        <NumberField
          label="Z 抬笔速度"
          min={0}
          value={machine.zTravelFeedRate}
          onChange={(value) => updateMachineConfig({ zTravelFeedRate: value })}
        />
      </div>

      <div className="field-grid">
        <NumberField
          label="Z 落笔速度"
          min={0}
          value={machine.zDrawFeedRate}
          onChange={(value) => updateMachineConfig({ zDrawFeedRate: value })}
        />
        <NumberField
          label="抬笔高度"
          min={0}
          value={machine.penUpZ}
          onChange={(value) => updateMachineConfig({ penUpZ: value })}
        />
      </div>

      <NumberField
        label="落笔高度"
        value={machine.penDownZ}
        onChange={(value) => updateMachineConfig({ penDownZ: value })}
      />

      <TextField
        label="抬笔命令模板"
        value={machine.penUpCommandTemplate}
        onChange={(value) => updateMachineConfig({ penUpCommandTemplate: value })}
      />
      <TextField
        label="落笔命令模板"
        value={machine.penDownCommandTemplate}
        onChange={(value) => updateMachineConfig({ penDownCommandTemplate: value })}
      />
      <TextAreaField
        label="G-code 文件开头命令"
        value={machine.headerGcode}
        onChange={(value) => updateMachineConfig({ headerGcode: value })}
      />
      <TextAreaField
        label="G-code 文件结尾命令"
        value={machine.footerGcode}
        onChange={(value) => updateMachineConfig({ footerGcode: value })}
      />

      <p className="hint">
        当前导出前仍需手动把笔头移动到纸张左上角，并在外部 sender 执行 G92 X0 Y0。
      </p>
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea rows={3} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function NumberField({
  label,
  min,
  value,
  onChange,
}: {
  label: string;
  min?: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        min={min}
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
