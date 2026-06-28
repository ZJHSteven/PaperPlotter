import { useProjectStore } from '../../state/projectStore';
import type { MachineConfig } from '../../types/project';

type MachineSettingsPanelProps = {
  machine: MachineConfig;
};

/**
 * 机器参数面板。
 *
 * MVP 必须让速度、方向、Z 参数可配置。
 * 第一阶段先暴露最影响安全的工作区和速度字段，后续 G-code 阶段会补齐模板字段。
 */
export function MachineSettingsPanel({ machine }: MachineSettingsPanelProps) {
  const updateMachineConfig = useProjectStore((state) => state.updateMachineConfig);

  return (
    <section className="panel-section">
      <h2>机器</h2>

      <div className="field-grid">
        <NumberField
          label="工作区宽 mm"
          value={machine.workAreaWidthMm}
          onChange={(value) => updateMachineConfig({ workAreaWidthMm: value })}
        />
        <NumberField
          label="工作区高 mm"
          value={machine.workAreaHeightMm}
          onChange={(value) => updateMachineConfig({ workAreaHeightMm: value })}
        />
      </div>

      <div className="field-grid">
        <NumberField
          label="空走速度"
          value={machine.travelFeedRate}
          onChange={(value) => updateMachineConfig({ travelFeedRate: value })}
        />
        <NumberField
          label="绘制速度"
          value={machine.drawFeedRate}
          onChange={(value) => updateMachineConfig({ drawFeedRate: value })}
        />
      </div>

      <p className="hint">
        当前导出前仍需手动把笔头移动到纸张左上角，并在外部 sender 执行 G92 X0 Y0。
      </p>
    </section>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        min={0}
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
