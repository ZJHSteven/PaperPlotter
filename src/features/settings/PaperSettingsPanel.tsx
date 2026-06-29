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
  const setPaperMargins = useProjectStore((state) => state.setPaperMargins);
  const margins = paper.marginsMm ?? { left: 10, right: 10, top: 10, bottom: 10 };

  return (
    <section className="panel-section">
      <h2>纸张</h2>

      <label className="field">
        <span>纸张尺寸</span>
        <select
          value={paper.preset}
          onChange={(event) => setPaperPreset(event.target.value as PaperPreset)}
        >
          <option value="A4">A4（210 × 297 mm）</option>
          <option value="A5">A5（148 × 210 mm）</option>
          <option value="B5">B5（176 × 250 mm）</option>
          <option value="custom">自定义</option>
        </select>
      </label>

      <div className="field-grid">
        <label className="field field--inline-unit">
          <span>宽度</span>
          <input
            min={20}
            type="number"
            value={paper.widthMm}
            onChange={(event) => setCustomPaperSize(Number(event.target.value), paper.heightMm)}
          />
          <em>mm</em>
        </label>

        <label className="field field--inline-unit">
          <span>高度</span>
          <input
            min={20}
            type="number"
            value={paper.heightMm}
            onChange={(event) => setCustomPaperSize(paper.widthMm, Number(event.target.value))}
          />
          <em>mm</em>
        </label>
      </div>

      <label className="field">
        <span>方向</span>
        <span className="segmented-control" role="group" aria-label="纸张方向">
          <button
            className={paper.orientation === 'portrait' ? 'segmented-control__item segmented-control__item--active' : 'segmented-control__item'}
            type="button"
            onClick={() => setPaperOrientation('portrait')}
          >
            纵向
          </button>
          <button
            className={paper.orientation === 'landscape' ? 'segmented-control__item segmented-control__item--active' : 'segmented-control__item'}
            type="button"
            onClick={() => setPaperOrientation('landscape')}
          >
            横向
          </button>
        </span>
      </label>

      <div className="margin-grid" aria-label="纸张边距">
        <span>边距</span>
        <label className="field field--inline-unit">
          <span>左</span>
          <input
            min={0}
            type="number"
            value={margins.left}
            onChange={(event) => setPaperMargins({ ...margins, left: Number(event.target.value) })}
          />
          <em>mm</em>
        </label>
        <label className="field field--inline-unit">
          <span>右</span>
          <input
            min={0}
            type="number"
            value={margins.right}
            onChange={(event) => setPaperMargins({ ...margins, right: Number(event.target.value) })}
          />
          <em>mm</em>
        </label>
        <label className="field field--inline-unit">
          <span>上</span>
          <input
            min={0}
            type="number"
            value={margins.top}
            onChange={(event) => setPaperMargins({ ...margins, top: Number(event.target.value) })}
          />
          <em>mm</em>
        </label>
        <label className="field field--inline-unit">
          <span>下</span>
          <input
            min={0}
            type="number"
            value={margins.bottom}
            onChange={(event) => setPaperMargins({ ...margins, bottom: Number(event.target.value) })}
          />
          <em>mm</em>
        </label>
      </div>
    </section>
  );
}
