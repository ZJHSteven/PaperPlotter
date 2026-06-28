import { useEffect, useState } from 'react';
import type { CalibrationConfig } from '../../types/project';
import { PAPER_CORNER_LABELS } from '../calibration/calibrationProgress';
import { applyHomographyToPoint } from '../calibration/paperHomography';
import { renderCorrectedImage } from '../calibration/renderCorrectedImage';

type CalibrationLayerProps = {
  calibration: CalibrationConfig;
  paperWidthMm: number;
  paperHeightMm: number;
  calibrationMode: boolean;
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
  calibrationMode,
}: CalibrationLayerProps) {
  const corners = calibration.paperCornersPx;
  const [correctedImageUrl, setCorrectedImageUrl] = useState<string>();
  const imageWidth = calibrationMode ? calibration.imageSizePx?.width ?? paperWidthMm : paperWidthMm;
  const imageHeight = calibrationMode ? calibration.imageSizePx?.height ?? paperHeightMm : paperHeightMm;
  const displayImageUrl = calibrationMode ? calibration.imageUrl : correctedImageUrl ?? calibration.imageUrl;

  useEffect(() => {
    let cancelled = false;

    if (
      import.meta.env.MODE === 'test' ||
      calibrationMode ||
      !calibration.imageUrl ||
      !calibration.result
    ) {
      setCorrectedImageUrl(undefined);
      return () => {
        cancelled = true;
      };
    }

    renderCorrectedImage({
      imageUrl: calibration.imageUrl,
      imageToPaperMatrix: calibration.result.imageToPaperMatrix,
      paperWidthMm,
      paperHeightMm,
    })
      .then((imageUrl) => {
        if (!cancelled) {
          setCorrectedImageUrl(imageUrl);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCorrectedImageUrl(undefined);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    calibration.imageUrl,
    calibration.result,
    calibrationMode,
    paperHeightMm,
    paperWidthMm,
  ]);

  return (
    <g aria-label="照片与纸角标定图层">
      {displayImageUrl ? (
        <image
          className="calibration-image"
          href={displayImageUrl}
          x={0}
          y={0}
          width={imageWidth}
          height={imageHeight}
          preserveAspectRatio="none"
        />
      ) : null}

      {corners
        ? (Object.entries(corners) as Array<[keyof typeof PAPER_CORNER_LABELS, { x: number; y: number }]>).map(
            ([key, point]) => {
              const displayPoint =
                calibrationMode || !calibration.result
                  ? point
                  : applyHomographyToPoint(point, calibration.result.imageToPaperMatrix);

              return (
                <g key={key} className="corner-marker">
                  <circle cx={displayPoint.x} cy={displayPoint.y} r={2.2} />
                  <text x={displayPoint.x + 3} y={displayPoint.y - 3}>
                    {PAPER_CORNER_LABELS[key]}
                  </text>
                </g>
              );
            },
          )
        : null}
    </g>
  );
}
