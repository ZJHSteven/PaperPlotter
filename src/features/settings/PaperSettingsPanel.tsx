import { useProjectStore } from '../../state/projectStore';
import type { PaperConfig, PaperPreset } from '../../types/project';

type PaperSettingsPanelProps = {
  paper: PaperConfig;
};

/**
 * 纸张设置面板。
 *
 * 这里用受控表单直接写入 Zustand 项目状态。
 * 由于 project store 已持久化，用户切换 A4/A5/B5 或自定义尺寸后刷新页面仍会保留。
 */
export function PaperSettingsPanel({ paper }: PaperSettingsPanelProps) {
  const setPaperPreset = useProjectStore((state) => state.setPaperPreset);
  const setPaperOrientation = useProjectStore((state) => state.setPaperOrientation);
  const setCustomPaperSize = useProjectStore((state) => state.setCustomPaperSize);

  return (
    <section className="panel-section">
      <h2>纸张</h2>

      <label className="field">
        <span>预设</span>
        <select
          value={paper.preset}
          onChange={(event) => setPaperPreset(event.target.value as PaperPreset)}
        >
          <option value="A4">A4</option>
          <option value="A5">A5</option>
          <option value="B5">B5</option>
          <option value="custom">自定义</option>
        </select>
      </label>

      <label className="field">
        <span>方向</span>
        <select
          value={paper.orientation}
          onChange={(event) => setPaperOrientation(event.target.value as PaperConfig['orientation'])}
        >
          <option value="portrait">纵向</option>
          <option value="landscape">横向</option>
        </select>
      </label>

      <div className="field-grid">
        <label className="field">
          <span>宽度 mm</span>
          <input
            min={20}
            type="number"
            value={paper.widthMm}
            onChange={(event) => setCustomPaperSize(Number(event.target.value), paper.heightMm)}
          />
        </label>

        <label className="field">
          <span>高度 mm</span>
          <input
            min={20}
            type="number"
            value={paper.heightMm}
            onChange={(event) => setCustomPaperSize(paper.widthMm, Number(event.target.value))}
          />
        </label>
      </div>
    </section>
  );
}
