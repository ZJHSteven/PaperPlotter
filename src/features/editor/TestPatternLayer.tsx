import type { DesignObject, TestPatternObject } from '../../types/project';

type TestPatternLayerProps = {
  object: DesignObject;
};

/**
 * 测试图案图层。
 *
 * 第 1 阶段只渲染计划书验收所需的 20mm 方框。
 * 后续第 3 步会扩展十字、网格、拖动和路径预览。
 */
export function TestPatternLayer({ object }: TestPatternLayerProps) {
  if (object.type !== 'test-pattern') {
    return null;
  }

  if (object.kind === 'rectangle') {
    return <RectanglePattern object={object} />;
  }

  if (object.kind === 'cross') {
    return <CrossPattern object={object} />;
  }

  return null;
}

function RectanglePattern({ object }: { object: TestPatternObject }) {
  return (
    <g className="test-pattern" aria-label="矩形测试图案">
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

function CrossPattern({ object }: { object: TestPatternObject }) {
  const centerX = object.xMm + object.widthMm / 2;
  const centerY = object.yMm + object.heightMm / 2;

  return (
    <g className="test-pattern" aria-label="十字测试图案">
      <line x1={object.xMm} y1={centerY} x2={object.xMm + object.widthMm} y2={centerY} />
      <line x1={centerX} y1={object.yMm} x2={centerX} y2={object.yMm + object.heightMm} />
    </g>
  );
}
