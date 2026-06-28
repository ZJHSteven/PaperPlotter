import type { MachinePoint, PaperPoint, PolylinePath } from '../../types/geometry';
import type { CalibrationResult } from '../../types/project';

/**
 * 把纸面毫米点转换成机器 G-code 坐标点。
 *
 * 这里使用第 6 步机器参考线标定得到的 `paperToMachineMatrix`。
 * 当前 MVP 约定纸张左上角已经由用户手动执行 `G92 X0 Y0`，所以没有额外原点平移。
 */
export function paperPointToMachinePoint(
  point: PaperPoint,
  calibration: Pick<CalibrationResult, 'paperToMachineMatrix'>,
): MachinePoint {
  const matrix = calibration.paperToMachineMatrix;

  return {
    x: matrix.a * point.x + matrix.c * point.y + matrix.e,
    y: matrix.b * point.x + matrix.d * point.y + matrix.f,
  };
}

/**
 * 批量转换折线路径。
 *
 * G-code 导出阶段会把所有纸面路径先转换成机器路径，再交给导出器。
 */
export function paperPathsToMachinePaths(
  paths: PolylinePath[],
  calibration: Pick<CalibrationResult, 'paperToMachineMatrix'>,
): PolylinePath[] {
  return paths.map((path) => ({
    ...path,
    points: path.points.map((point) => paperPointToMachinePoint(point, calibration)),
  }));
}
