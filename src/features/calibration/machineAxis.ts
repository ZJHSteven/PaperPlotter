import type { Matrix2D, Vector2 } from '../../types/geometry';
import type {
  CalibrationResult,
  MachineAxisLinePx,
  MachineConfig,
} from '../../types/project';
import { applyHomographyToPoint } from './paperHomography';

export type MachineAxisInPaper = {
  axis: 'x' | 'y';
  direction: Vector2;
  machineXAxisDirection: Vector2;
  angleRad: number;
};

/**
 * 根据照片中的机器参考线，计算机器轴在纸面坐标中的方向。
 *
 * 输入线段仍然是照片 px 坐标，所以第一步必须用 imageToPaper 矩阵转成纸面 mm。
 * 如果用户说这条线代表机器 X 轴，那么它本身就是机器 X 方向。
 * 如果用户说这条线代表机器 Y 轴，那么把 Y 方向逆时针旋转 90°，得到机器 X 方向。
 */
export function computeMachineAxisInPaper(
  line: MachineAxisLinePx,
  calibration: Pick<CalibrationResult, 'imageToPaperMatrix'>,
): MachineAxisInPaper {
  const p1 = applyHomographyToPoint(line.p1, calibration.imageToPaperMatrix);
  const p2 = applyHomographyToPoint(line.p2, calibration.imageToPaperMatrix);
  const direction = normalizeVector({
    x: p2.x - p1.x,
    y: p2.y - p1.y,
  });
  const machineXAxisDirection = line.axis === 'x'
    ? direction
    : normalizeVector({
        x: direction.y,
        y: -direction.x,
      });

  return {
    axis: line.axis,
    direction,
    machineXAxisDirection,
    angleRad: Math.atan2(machineXAxisDirection.y, machineXAxisDirection.x),
  };
}

/**
 * 根据机器 X 轴方向和机器 Y 方向配置，生成纸面点到机器点的 2D 仿射矩阵。
 *
 * 当前 MVP 约定纸张左上角就是用户执行 `G92 X0 Y0` 的机器原点，
 * 所以矩阵没有平移项，只负责把纸面向量投影到机器 X/Y 轴。
 */
export function createPaperToMachineMatrix(
  machineXAxisDirection: Vector2,
  machineConfig: Pick<MachineConfig, 'yDirection'>,
): Matrix2D {
  const xUnit = normalizeVector(machineXAxisDirection);
  const yUnit = {
    x: -xUnit.y,
    y: xUnit.x,
  };
  const ySign = machineConfig.yDirection === 'same-as-paper-down' ? 1 : -1;

  return {
    a: xUnit.x,
    b: ySign * yUnit.x,
    c: xUnit.y,
    d: ySign * yUnit.y,
    e: 0,
    f: 0,
  };
}

function normalizeVector(vector: Vector2): Vector2 {
  const length = Math.hypot(vector.x, vector.y);

  if (!Number.isFinite(length) || length < 1e-9) {
    throw new Error('机器参考线过短，无法计算方向。');
  }

  return {
    x: vector.x / length,
    y: vector.y / length,
  };
}
