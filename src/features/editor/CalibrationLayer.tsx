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
  markerScale: number;
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
  markerScale,
}: CalibrationLayerProps) {
  const corners = calibration.paperCornersPx;
  const [correctedImageUrl, setCorrectedImageUrl] = useState<string>();
  const imageWidth = calibrationMode ? calibration.imageSizePx?.width ?? paperWidthMm : paperWidthMm;
  const imageHeight = calibrationMode ? calibration.imageSizePx?.height ?? paperHeightMm : paperHeightMm;
  const displayImageUrl = calibrationMode ? calibration.imageUrl : correctedImageUrl ?? calibration.imageUrl;
  const machineAxisLine = calibration.machineAxisLinePx ??
    (calibration.machineAxisLineDraftPx?.p1
      ? {
          p1: calibration.machineAxisLineDraftPx.p1,
          p2: calibration.machineAxisLineDraftPx.p2,
          axis: calibration.machineAxisLineDraftPx.axis,
        }
      : undefined);

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
                  <circle cx={displayPoint.x} cy={displayPoint.y} r={markerScale} />
                  <circle className="corner-marker__core" cx={displayPoint.x} cy={displayPoint.y} r={markerScale * 0.28} />
                  <text x={displayPoint.x + markerScale * 1.25} y={displayPoint.y - markerScale * 1.05}>
                    {getCornerIndex(key)}
                  </text>
                  <title>{PAPER_CORNER_LABELS[key]}</title>
                </g>
              );
            },
          )
        : null}

      {!calibrationMode && calibration.result && machineAxisLine ? (
        <MachineAxisLine calibration={calibration} line={machineAxisLine} />
      ) : null}
    </g>
  );
}

function getCornerIndex(key: keyof typeof PAPER_CORNER_LABELS) {
  if (key === 'topLeft') {
    return '1';
  }

  if (key === 'topRight') {
    return '2';
  }

  if (key === 'bottomRight') {
    return '3';
  }

  return '4';
}

function MachineAxisLine({
  calibration,
  line,
}: {
  calibration: CalibrationConfig;
  line: {
    p1: { x: number; y: number };
    p2?: { x: number; y: number };
    axis: 'x' | 'y';
  };
}) {
  const p1 = applyHomographyToPoint(line.p1, calibration.result!.imageToPaperMatrix);
  const p2 = line.p2
    ? applyHomographyToPoint(line.p2, calibration.result!.imageToPaperMatrix)
    : undefined;

  return (
    <g className="machine-axis-marker" aria-label="机器参考线">
      <circle cx={p1.x} cy={p1.y} r={2} />
      {p2 ? (
        <>
          <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} />
          <circle cx={p2.x} cy={p2.y} r={2} />
          <text x={(p1.x + p2.x) / 2 + 3} y={(p1.y + p2.y) / 2 - 3}>
            机器 {line.axis.toUpperCase()} 参考线
          </text>
        </>
      ) : (
        <text x={p1.x + 3} y={p1.y - 3}>
          参考线起点
        </text>
      )}
    </g>
  );
}
