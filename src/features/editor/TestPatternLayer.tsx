import type { PointerEvent } from 'react';
import type { DesignObject, TestPatternObject } from '../../types/project';

type TestPatternLayerProps = {
  object: DesignObject;
  selected: boolean;
  onPointerDown: (event: PointerEvent<SVGGElement>) => void;
};

/**
 * 测试图案图层。
 *
 * 第 1 阶段只渲染计划书验收所需的 20mm 方框。
 * 后续第 3 步会扩展十字、网格、拖动和路径预览。
 */
export function TestPatternLayer({ object, selected, onPointerDown }: TestPatternLayerProps) {
  if (object.type !== 'test-pattern') {
    return null;
  }

  if (object.kind === 'rectangle') {
    return <RectanglePattern object={object} selected={selected} onPointerDown={onPointerDown} />;
  }

  if (object.kind === 'cross') {
    return <CrossPattern object={object} selected={selected} onPointerDown={onPointerDown} />;
  }

  return null;
}

function RectanglePattern({
  object,
  selected,
  onPointerDown,
}: {
  object: TestPatternObject;
  selected: boolean;
  onPointerDown: (event: PointerEvent<SVGGElement>) => void;
}) {
  return (
    <g
      className={selected ? 'test-pattern test-pattern--selected' : 'test-pattern'}
      aria-label="矩形测试图案"
      onPointerDown={onPointerDown}
    >
      <rect
        x={object.xMm}
        y={object.yMm}
        width={object.widthMm}
        height={object.heightMm}
      />
      <text x={object.xMm} y={object.yMm - 2}>
        {object.widthMm}mm 方框
      </text>
    </g>
  );
}

function CrossPattern({
  object,
  selected,
  onPointerDown,
}: {
  object: TestPatternObject;
  selected: boolean;
  onPointerDown: (event: PointerEvent<SVGGElement>) => void;
}) {
  const centerX = object.xMm + object.widthMm / 2;
  const centerY = object.yMm + object.heightMm / 2;

  return (
    <g
      className={selected ? 'test-pattern test-pattern--selected' : 'test-pattern'}
      aria-label="十字测试图案"
      onPointerDown={onPointerDown}
    >
      <line x1={object.xMm} y1={centerY} x2={object.xMm + object.widthMm} y2={centerY} />
      <line x1={centerX} y1={object.yMm} x2={centerX} y2={object.yMm + object.heightMm} />
      <text x={object.xMm} y={object.yMm - 2}>
        十字
      </text>
    </g>
  );
}
