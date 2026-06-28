import type { PaperPoint, PolylinePath } from '../../types/geometry';
import type { MachineConfig, ZCalibrationConfig } from '../../types/project';

export type FineScanPlan = {
  candidates: {
    index: number;
    z: number;
    path: PolylinePath;
  }[];
  gcode: string;
};

/**
 * 计算“向纸面下降一步”后的 Z。
 *
 * 如果 Z 正方向是 up，则下降代表 Z 变小。
 * 如果 Z 正方向是 down，则下降代表 Z 变大。
 */
export function stepZTowardPaper(currentZ: number, config: Pick<ZCalibrationConfig, 'zPositiveDirection' | 'coarseStepMm'>) {
  const directionSign = config.zPositiveDirection === 'up' ? -1 : 1;

  return roundMm(currentZ + directionSign * config.coarseStepMm);
}

/**
 * 阶段 A：生成“下降一步并点一下”的粗找 G-code。
 *
 * 这里不平移测试点，只在同一位置点一下，让用户快速判断是否已经接触纸面。
 */
export function generateCoarseDotProbeGcode(
  testPoint: PaperPoint,
  currentZ: number,
  config: ZCalibrationConfig,
  machineConfig: MachineConfig,
) {
  validateTestPoint(testPoint);

  return [
    '; PaperPlotter Z 粗找：下降一步并点一下',
    machineConfig.headerGcode,
    renderPenUp(machineConfig),
    `G0 X${formatNumber(testPoint.x)} Y${formatNumber(testPoint.y)} F${formatNumber(machineConfig.travelFeedRate)}`,
    `G1 Z${formatNumber(currentZ)} F${formatNumber(config.zFeedRate)}`,
    'G4 P0.15',
    renderPenUp(machineConfig),
    machineConfig.footerGcode,
  ].join('\n') + '\n';
}

/**
 * 阶段 B：在接触高度附近生成 3-4 条短线。
 *
 * 候选 Z 从浅到深排列，用户选择第一条“连续、清楚、无明显压痕”的线。
 */
export function generateFineLineScanGcode(
  testArea: NonNullable<ZCalibrationConfig['testArea']>,
  contactApproxZ: number,
  config: ZCalibrationConfig,
  machineConfig: MachineConfig,
): FineScanPlan {
  validateFineScanConfig(testArea, config);

  const count = config.testLineCount;
  const centerIndex = (count - 1) / 2;
  const directionSign = config.zPositiveDirection === 'up' ? -1 : 1;
  const candidates = Array.from({ length: count }, (_, index) => {
    const z = roundMm(contactApproxZ + (index - centerIndex) * directionSign * config.fineStepMm);
    const y = testArea.yMm + index * config.testLineSpacingMm;

    return {
      index: index + 1,
      z,
      path: {
        points: [
          { x: testArea.xMm, y },
          { x: testArea.xMm + config.testLineLengthMm, y },
        ],
      },
    };
  });

  const lines = [
    '; PaperPlotter Z 细调：短线扫描',
    machineConfig.headerGcode,
    renderPenUp(machineConfig),
  ];

  candidates.forEach((candidate) => {
    const start = candidate.path.points[0];
    const end = candidate.path.points[1];
    lines.push(`; Line ${candidate.index}: Z=${formatNumber(candidate.z)}`);
    lines.push(`G0 X${formatNumber(start.x)} Y${formatNumber(start.y)} F${formatNumber(machineConfig.travelFeedRate)}`);
    lines.push(`G1 Z${formatNumber(candidate.z)} F${formatNumber(config.zFeedRate)}`);
    lines.push(`G1 X${formatNumber(end.x)} Y${formatNumber(end.y)} F${formatNumber(config.testDrawFeedRate)}`);
    lines.push(renderPenUp(machineConfig));
  });

  lines.push(machineConfig.footerGcode);

  return {
    candidates,
    gcode: `${lines.join('\n')}\n`,
  };
}

function renderPenUp(machineConfig: MachineConfig) {
  return machineConfig.penUpCommandTemplate
    .replaceAll('{z}', formatNumber(machineConfig.penUpZ))
    .replaceAll('{feed}', formatNumber(machineConfig.zTravelFeedRate));
}

function validateTestPoint(point: PaperPoint) {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new Error('Z 标定测试点必须是有效纸面坐标。');
  }
}

function validateFineScanConfig(
  testArea: NonNullable<ZCalibrationConfig['testArea']>,
  config: ZCalibrationConfig,
) {
  validateTestPoint({ x: testArea.xMm, y: testArea.yMm });

  if (config.testLineCount < 3 || config.testLineCount > 4) {
    throw new Error('Z 细调线数量必须是 3 或 4 条。');
  }

  if (config.fineStepMm <= 0 || config.testLineLengthMm <= 0 || config.testLineSpacingMm <= 0) {
    throw new Error('Z 细调步长、测试线长度和测试线间距必须大于 0。');
  }
}

function formatNumber(value: number) {
  return Number(value.toFixed(3)).toString();
}

function roundMm(value: number) {
  return Math.round(value * 1000) / 1000;
}
