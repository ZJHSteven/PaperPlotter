import type { DesignObject, PaperConfig } from '../../types/project';
import { PaperLayer } from './PaperLayer';
import { TestPatternLayer } from './TestPatternLayer';

type SvgCanvasProps = {
  paper: PaperConfig;
  objects: DesignObject[];
};

/**
 * SVG 纸面画布。
 *
 * SVG 的 viewBox 直接使用毫米作为逻辑单位。
 * 这样后续路径预览和 G-code 坐标可以共用同一套纸面数据，不需要 UI 像素和毫米反复换算。
 */
export function SvgCanvas({ paper, objects }: SvgCanvasProps) {
  const paddingMm = 18;
  const viewBox = [
    -paddingMm,
    -paddingMm,
    paper.widthMm + paddingMm * 2,
    paper.heightMm + paddingMm * 2,
  ].join(' ');

  return (
    <section className="canvas-panel" aria-label="SVG 纸面画布">
      <div className="canvas-panel__header">
        <div>
          <h2>纸面预览</h2>
          <p>{paper.widthMm} mm × {paper.heightMm} mm，SVG 坐标单位 = mm</p>
        </div>
        <span className="canvas-scale">100%</span>
      </div>

      <div className="canvas-viewport">
        <svg
          role="img"
          aria-label="纸张毫米坐标预览"
          className="paper-svg"
          viewBox={viewBox}
        >
          <PaperLayer paper={paper} />
          {objects.map((object) => (
            <TestPatternLayer key={object.id} object={object} />
          ))}
        </svg>
      </div>
    </section>
  );
}
