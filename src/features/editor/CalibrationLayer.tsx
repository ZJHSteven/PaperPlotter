import type { CalibrationConfig } from '../../types/project';
import { PAPER_CORNER_LABELS } from '../calibration/calibrationProgress';

type CalibrationLayerProps = {
  calibration: CalibrationConfig;
  paperWidthMm: number;
  paperHeightMm: number;
};

/**
 * 标定图层。
 *
 * 当前阶段把导入照片作为半透明纸面背景，并显示用户点选的四个纸角。
 * 后续会基于 imageToPaper 矩阵把照片真正透视校正到纸面。
 */
export function CalibrationLayer({
  calibration,
  paperWidthMm,
  paperHeightMm,
}: CalibrationLayerProps) {
  const corners = calibration.paperCornersPx;

  return (
    <g aria-label="照片与纸角标定图层">
      {calibration.imageUrl ? (
        <image
          className="calibration-image"
          href={calibration.imageUrl}
          x={0}
          y={0}
          width={paperWidthMm}
          height={paperHeightMm}
          preserveAspectRatio="none"
        />
      ) : null}

      {corners
        ? (Object.entries(corners) as Array<[keyof typeof PAPER_CORNER_LABELS, { x: number; y: number }]>).map(
            ([key, point]) => (
              <g key={key} className="corner-marker">
                <circle cx={point.x} cy={point.y} r={2.2} />
                <text x={point.x + 3} y={point.y - 3}>
                  {PAPER_CORNER_LABELS[key]}
                </text>
              </g>
            ),
          )
        : null}
    </g>
  );
}
