import type { PaperConfig } from '../../types/project';

type PaperLayerProps = {
  paper: PaperConfig;
};

/**
 * 绘制纸张底层。
 *
 * 当前阶段只画纸张矩形和 10mm 网格。
 * 后续照片校正背景、四角标定点和机器参考线会继续叠加在这个图层上方。
 */
export function PaperLayer({ paper }: PaperLayerProps) {
  const gridLines = buildGridLines(paper.widthMm, paper.heightMm, 10);

  return (
    <g aria-label="纸张图层">
      <rect className="paper-shadow" x={0} y={0} width={paper.widthMm} height={paper.heightMm} />
      <rect className="paper-sheet" x={0} y={0} width={paper.widthMm} height={paper.heightMm} />

      {gridLines.map((line) => (
        <line
          key={line.key}
          className={line.major ? 'grid-line grid-line--major' : 'grid-line'}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
        />
      ))}

      <text className="axis-label" x={4} y={-5}>
        纸张左上角 (0, 0)
      </text>
    </g>
  );
}

type GridLine = {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  major: boolean;
};

/**
 * 生成纸面网格线。
 *
 * @param widthMm 纸张宽度。
 * @param heightMm 纸张高度。
 * @param stepMm 网格间距。
 * @returns 可直接渲染为 SVG line 的线段列表。
 */
function buildGridLines(widthMm: number, heightMm: number, stepMm: number): GridLine[] {
  const lines: GridLine[] = [];

  for (let x = 0; x <= widthMm; x += stepMm) {
    lines.push({
      key: `x-${x}`,
      x1: x,
      y1: 0,
      x2: x,
      y2: heightMm,
      major: x % 50 === 0,
    });
  }

  for (let y = 0; y <= heightMm; y += stepMm) {
    lines.push({
      key: `y-${y}`,
      x1: 0,
      y1: y,
      x2: widthMm,
      y2: y,
      major: y % 50 === 0,
    });
  }

  return lines;
}
