import type { HomographyMatrix, ImagePoint, PaperPoint } from '../../types/geometry';
import type { PaperCornersPx } from '../../types/project';

/**
 * 纸张照片透视标定。
 *
 * Homography（单应性矩阵）用于把照片上的任意点映射到真实纸面毫米坐标。
 * 用户在照片中点选四个纸角后，我们知道 4 组对应关系：
 * - 照片左上角点 -> 纸面 (0, 0)
 * - 照片右上角点 -> 纸面 (paperWidthMm, 0)
 * - 照片右下角点 -> 纸面 (paperWidthMm, paperHeightMm)
 * - 照片左下角点 -> 纸面 (0, paperHeightMm)
 *
 * 透视变换矩阵形如：
 * x' = (h0*x + h1*y + h2) / (h6*x + h7*y + h8)
 * y' = (h3*x + h4*y + h5) / (h6*x + h7*y + h8)
 *
 * 为了去掉整体缩放自由度，固定 h8 = 1，然后用 8 个方程解 8 个未知数。
 */
export function computeImageToPaperTransform(
  cornersPx: PaperCornersPx,
  paperWidthMm: number,
  paperHeightMm: number,
): HomographyMatrix {
  validatePaperSize(paperWidthMm, paperHeightMm);
  validateCorners(cornersPx);

  const pairs = [
    { from: cornersPx.topLeft, to: { x: 0, y: 0 } },
    { from: cornersPx.topRight, to: { x: paperWidthMm, y: 0 } },
    { from: cornersPx.bottomRight, to: { x: paperWidthMm, y: paperHeightMm } },
    { from: cornersPx.bottomLeft, to: { x: 0, y: paperHeightMm } },
  ];

  const equations: number[][] = [];
  const results: number[] = [];

  pairs.forEach(({ from, to }) => {
    const x = from.x;
    const y = from.y;
    const u = to.x;
    const v = to.y;

    equations.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    results.push(u);
    equations.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    results.push(v);
  });

  const solution = solveLinearSystem(equations, results);

  return [
    solution[0],
    solution[1],
    solution[2],
    solution[3],
    solution[4],
    solution[5],
    solution[6],
    solution[7],
    1,
  ];
}

/**
 * 使用单应性矩阵把照片点映射到纸面点。
 *
 * @param point 照片像素点。
 * @param matrix `computeImageToPaperTransform` 得到的 3x3 矩阵。
 * @returns 纸面毫米坐标。
 */
export function applyHomographyToPoint(
  point: ImagePoint,
  matrix: HomographyMatrix,
): PaperPoint {
  const denominator = matrix[6] * point.x + matrix[7] * point.y + matrix[8];

  if (Math.abs(denominator) < 1e-10) {
    throw new Error('透视变换失败：点落在无穷远处，无法映射到纸面。');
  }

  return {
    x: (matrix[0] * point.x + matrix[1] * point.y + matrix[2]) / denominator,
    y: (matrix[3] * point.x + matrix[4] * point.y + matrix[5]) / denominator,
  };
}

function validatePaperSize(widthMm: number, heightMm: number) {
  if (!Number.isFinite(widthMm) || !Number.isFinite(heightMm) || widthMm <= 0 || heightMm <= 0) {
    throw new Error('纸张尺寸必须是大于 0 的有效毫米数。');
  }
}

function validateCorners(corners: PaperCornersPx) {
  const points = [corners.topLeft, corners.topRight, corners.bottomRight, corners.bottomLeft];

  points.forEach((point, index) => {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      throw new Error(`第 ${index + 1} 个纸角不是有效照片坐标。`);
    }
  });

  const polygonArea = Math.abs(
    signedPolygonArea(points.map((point) => ({ x: point.x, y: point.y }))),
  );

  if (polygonArea < 1e-6) {
    throw new Error('纸张四角面积过小，请确认四个点没有重合或共线。');
  }
}

function signedPolygonArea(points: ImagePoint[]) {
  let area = 0;

  points.forEach((point, index) => {
    const next = points[(index + 1) % points.length];
    area += point.x * next.y - next.x * point.y;
  });

  return area / 2;
}

/**
 * 用高斯消元解线性方程组。
 *
 * 这里不引入额外数学库，原因是 8x8 方程规模很小，手写消元更容易控制错误信息。
 */
function solveLinearSystem(matrix: number[][], vector: number[]) {
  const size = vector.length;
  const augmented = matrix.map((row, index) => [...row, vector[index]]);

  for (let column = 0; column < size; column += 1) {
    let pivotRow = column;

    for (let row = column + 1; row < size; row += 1) {
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivotRow][column])) {
        pivotRow = row;
      }
    }

    if (Math.abs(augmented[pivotRow][column]) < 1e-10) {
      throw new Error('透视变换求解失败：四角点可能过于接近、重合或共线。');
    }

    [augmented[column], augmented[pivotRow]] = [augmented[pivotRow], augmented[column]];

    const pivot = augmented[column][column];
    for (let col = column; col <= size; col += 1) {
      augmented[column][col] /= pivot;
    }

    for (let row = 0; row < size; row += 1) {
      if (row === column) {
        continue;
      }

      const factor = augmented[row][column];
      for (let col = column; col <= size; col += 1) {
        augmented[row][col] -= factor * augmented[column][col];
      }
    }
  }

  return augmented.map((row) => row[size]);
}
