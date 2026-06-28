import type { PolylinePath } from '../../types/geometry';
import type { TestPatternObject } from '../../types/project';

/**
 * 把测试图案对象转换成统一折线路径。
 *
 * UI 可以直接画 rect/line，但 G-code 导出阶段不能依赖 SVG 元素。
 * 所以每一种测试图案都必须先变成 `PolylinePath[]`，后续导出器只处理路径数组。
 */
export function testPatternToPaths(object: TestPatternObject): PolylinePath[] {
  if (object.widthMm <= 0 || object.heightMm <= 0) {
    return [];
  }

  if (object.kind === 'rectangle') {
    return rectangleToPaths(object);
  }

  if (object.kind === 'cross') {
    return crossToPaths(object);
  }

  if (object.kind === 'grid') {
    return gridToPaths(object);
  }

  if (object.kind === 'line-scan') {
    return lineScanToPaths(object);
  }

  return [];
}

function rectangleToPaths(object: TestPatternObject): PolylinePath[] {
  const x1 = object.xMm;
  const y1 = object.yMm;
  const x2 = object.xMm + object.widthMm;
  const y2 = object.yMm + object.heightMm;

  return [
    {
      closed: true,
      points: [
        { x: x1, y: y1 },
        { x: x2, y: y1 },
        { x: x2, y: y2 },
        { x: x1, y: y2 },
      ],
    },
  ];
}

function crossToPaths(object: TestPatternObject): PolylinePath[] {
  const centerX = object.xMm + object.widthMm / 2;
  const centerY = object.yMm + object.heightMm / 2;

  return [
    {
      points: [
        { x: object.xMm, y: centerY },
        { x: object.xMm + object.widthMm, y: centerY },
      ],
    },
    {
      points: [
        { x: centerX, y: object.yMm },
        { x: centerX, y: object.yMm + object.heightMm },
      ],
    },
  ];
}

function gridToPaths(object: TestPatternObject): PolylinePath[] {
  const paths: PolylinePath[] = [];
  const stepMm = 10;

  for (let x = object.xMm; x <= object.xMm + object.widthMm; x += stepMm) {
    paths.push({
      points: [
        { x, y: object.yMm },
        { x, y: object.yMm + object.heightMm },
      ],
    });
  }

  for (let y = object.yMm; y <= object.yMm + object.heightMm; y += stepMm) {
    paths.push({
      points: [
        { x: object.xMm, y },
        { x: object.xMm + object.widthMm, y },
      ],
    });
  }

  return paths;
}

function lineScanToPaths(object: TestPatternObject): PolylinePath[] {
  const lineCount = 4;
  const spacing = object.heightMm / Math.max(1, lineCount - 1);

  return Array.from({ length: lineCount }, (_, index) => {
    const y = object.yMm + spacing * index;

    return {
      points: [
        { x: object.xMm, y },
        { x: object.xMm + object.widthMm, y },
      ],
    };
  });
}
