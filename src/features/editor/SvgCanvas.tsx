import { useMemo, useRef, useState, type PointerEvent } from 'react';
import type { CalibrationConfig, DesignObject, PaperConfig } from '../../types/project';
import { useProjectStore } from '../../state/projectStore';
import { PaperLayer } from './PaperLayer';
import { TestPatternLayer } from './TestPatternLayer';
import { CalibrationLayer } from './CalibrationLayer';

type SvgCanvasProps = {
  paper: PaperConfig;
  calibration: CalibrationConfig;
  objects: DesignObject[];
  selectedObjectId?: string;
};

/**
 * SVG 纸面画布。
 *
 * SVG 的 viewBox 直接使用毫米作为逻辑单位。
 * 这样后续路径预览和 G-code 坐标可以共用同一套纸面数据，不需要 UI 像素和毫米反复换算。
 */
export function SvgCanvas({ paper, calibration, objects, selectedObjectId }: SvgCanvasProps) {
  const selectObject = useProjectStore((state) => state.selectObject);
  const moveObject = useProjectStore((state) => state.moveObject);
  const addPaperCornerPoint = useProjectStore((state) => state.addPaperCornerPoint);
  const paddingMm = 18;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragStartRef = useRef<{
    kind: 'pan' | 'object';
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startPanX: number;
    startPanY: number;
    objectId?: string;
    objectStartX?: number;
    objectStartY?: number;
  } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panMm, setPanMm] = useState({ x: 0, y: 0 });
  const calibrationMode = Boolean(
    calibration.imageUrl && calibration.imageSizePx && !calibration.result,
  );
  const baseView = useMemo(
    () => ({
      x: calibrationMode ? 0 : -paddingMm,
      y: calibrationMode ? 0 : -paddingMm,
      width: calibrationMode
        ? calibration.imageSizePx?.width ?? paper.widthMm
        : paper.widthMm + paddingMm * 2,
      height: calibrationMode
        ? calibration.imageSizePx?.height ?? paper.heightMm
        : paper.heightMm + paddingMm * 2,
    }),
    [
      calibration.imageSizePx?.height,
      calibration.imageSizePx?.width,
      calibrationMode,
      paper.heightMm,
      paper.widthMm,
    ],
  );
  const visibleView = useMemo(() => {
    const width = baseView.width / zoom;
    const height = baseView.height / zoom;
    const centerX = baseView.x + baseView.width / 2 + panMm.x;
    const centerY = baseView.y + baseView.height / 2 + panMm.y;

    return {
      x: centerX - width / 2,
      y: centerY - height / 2,
      width,
      height,
    };
  }, [baseView, panMm.x, panMm.y, zoom]);
  const viewBox = [
    visibleView.x,
    visibleView.y,
    visibleView.width,
    visibleView.height,
  ].join(' ');

  function changeZoom(nextZoom: number) {
    setZoom(clampZoom(nextZoom));
  }

  function resetView() {
    setZoom(1);
    setPanMm({ x: 0, y: 0 });
  }

  function handlePointerDown(event: PointerEvent<SVGSVGElement>) {
    if (event.button !== 0) {
      return;
    }

    dragStartRef.current = {
      kind: 'pan',
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPanX: panMm.x,
      startPanY: panMm.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    const dragStart = dragStartRef.current;
    const svgElement = svgRef.current;

    if (!dragStart || dragStart.pointerId !== event.pointerId || !svgElement) {
      return;
    }

    const bounds = svgElement.getBoundingClientRect();
    const mmPerPixelX = visibleView.width / bounds.width;
    const mmPerPixelY = visibleView.height / bounds.height;
    const deltaX = event.clientX - dragStart.startClientX;
    const deltaY = event.clientY - dragStart.startClientY;

    if (dragStart.kind === 'object' && dragStart.objectId) {
      moveObject(
        dragStart.objectId,
        (dragStart.objectStartX ?? 0) + deltaX * mmPerPixelX,
        (dragStart.objectStartY ?? 0) + deltaY * mmPerPixelY,
      );
      return;
    }

    setPanMm({
      x: dragStart.startPanX - deltaX * mmPerPixelX,
      y: dragStart.startPanY - deltaY * mmPerPixelY,
    });
  }

  function handlePointerUp(event: PointerEvent<SVGSVGElement>) {
    if (dragStartRef.current?.pointerId === event.pointerId) {
      dragStartRef.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleCanvasClick(event: PointerEvent<SVGSVGElement>) {
    if (!calibrationMode) {
      return;
    }

    if ((event.target as Element).closest('.test-pattern')) {
      return;
    }

    addPaperCornerPoint(clientPointToSvgPoint(event));
  }

  function handleObjectPointerDown(event: PointerEvent<SVGGElement>, object: DesignObject) {
    if (event.button !== 0 || !('xMm' in object) || !('yMm' in object)) {
      return;
    }

    event.stopPropagation();
    selectObject(object.id);
    dragStartRef.current = {
      kind: 'object',
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPanX: panMm.x,
      startPanY: panMm.y,
      objectId: object.id,
      objectStartX: object.xMm,
      objectStartY: object.yMm,
    };
    svgRef.current?.setPointerCapture(event.pointerId);
  }

  return (
    <section className="canvas-panel" aria-label="SVG 纸面画布">
      <div className="canvas-panel__header">
        <div>
          <h2>纸面预览</h2>
          <p>
            {calibrationMode
              ? `${calibration.imageSizePx?.width} px × ${calibration.imageSizePx?.height} px，点击坐标 = 照片 px`
              : `${paper.widthMm} mm × ${paper.heightMm} mm，SVG 坐标单位 = mm`}
          </p>
        </div>
        <div className="canvas-tools" aria-label="画布视图工具">
          <button type="button" onClick={() => changeZoom(zoom / 1.25)} aria-label="缩小画布">
            -
          </button>
          <span className="canvas-scale">{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => changeZoom(zoom * 1.25)} aria-label="放大画布">
            +
          </button>
          <button type="button" onClick={resetView}>
            重置视图
          </button>
        </div>
      </div>

      <div className="canvas-viewport">
        <svg
          ref={svgRef}
          role="img"
          aria-label="纸张毫米坐标预览"
          className="paper-svg"
          viewBox={viewBox}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onClick={handleCanvasClick}
        >
          {calibrationMode ? null : <PaperLayer paper={paper} />}
          <CalibrationLayer
            calibration={calibration}
            paperWidthMm={paper.widthMm}
            paperHeightMm={paper.heightMm}
            calibrationMode={calibrationMode}
          />
          {calibrationMode
            ? null
            : objects.map((object) => (
                <TestPatternLayer
                  key={object.id}
                  object={object}
                  selected={object.id === selectedObjectId}
                  onPointerDown={(event) => handleObjectPointerDown(event, object)}
                />
              ))}
        </svg>
      </div>
    </section>
  );
}

function clientPointToSvgPoint(event: PointerEvent<SVGSVGElement>) {
  const svgElement = event.currentTarget;
  const svgPoint = svgElement.createSVGPoint();
  svgPoint.x = event.clientX;
  svgPoint.y = event.clientY;
  const transformedPoint = svgPoint.matrixTransform(svgElement.getScreenCTM()?.inverse());

  return {
    x: Math.round(transformedPoint.x * 100) / 100,
    y: Math.round(transformedPoint.y * 100) / 100,
  };
}

/**
 * 限制画布缩放范围。
 *
 * 过小会让纸张变成一个点，过大会让用户在空白区域迷路。
 * 这里先给 MVP 一个保守范围：25% 到 400%。
 */
function clampZoom(value: number) {
  return Math.min(4, Math.max(0.25, value));
}
