import type {
  MachineConfig,
  PaperConfig,
  PaperPreset,
  ProjectFile,
  ZCalibrationConfig,
} from '../types/project';

/**
 * 纸张预设尺寸表。
 *
 * 单位统一为毫米。这里保存的是纵向尺寸，横向通过 `applyPaperOrientation` 交换宽高。
 */
export const PAPER_PRESETS: Record<Exclude<PaperPreset, 'custom'>, Pick<PaperConfig, 'widthMm' | 'heightMm'>> = {
  A4: { widthMm: 210, heightMm: 297 },
  A5: { widthMm: 148, heightMm: 210 },
  B5: { widthMm: 176, heightMm: 250 },
};

export const DEFAULT_PAPER_MARGINS = {
  left: 10,
  right: 10,
  top: 10,
  bottom: 10,
};

/**
 * 根据预设和方向生成真实纸张尺寸。
 *
 * @param preset 用户选择的纸张预设。
 * @param orientation 横向或纵向。
 * @returns 带有宽高的纸张配置。
 */
export function createPresetPaperConfig(
  preset: Exclude<PaperPreset, 'custom'>,
  orientation: PaperConfig['orientation'],
): PaperConfig {
  const size = PAPER_PRESETS[preset];

  return orientation === 'portrait'
    ? { preset, orientation, widthMm: size.widthMm, heightMm: size.heightMm, marginsMm: DEFAULT_PAPER_MARGINS }
    : { preset, orientation, widthMm: size.heightMm, heightMm: size.widthMm, marginsMm: DEFAULT_PAPER_MARGINS };
}

/**
 * 默认机器参数。
 *
 * 这些数值不是对用户机器的断言，只是能让 MVP 第一屏可运行。
 * 后续设置面板会允许用户全部修改。
 */
export const DEFAULT_MACHINE_CONFIG: MachineConfig = {
  workAreaWidthMm: 300,
  workAreaHeightMm: 300,
  yDirection: 'same-as-paper-down',
  zPositiveDirection: 'up',
  travelFeedRate: 3000,
  drawFeedRate: 1200,
  testDrawFeedRate: 800,
  zTravelFeedRate: 1000,
  zDrawFeedRate: 500,
  penUpZ: 5,
  penDownZ: -1,
  penUpCommandTemplate: 'G0 Z{z} F{feed}',
  penDownCommandTemplate: 'G1 Z{z} F{feed}',
  headerGcode: 'G21\nG90',
  footerGcode: 'M2',
};

/**
 * 默认 Z 标定配置。
 *
 * MVP 的 Z 标定只实现单点流程，多点数据结构先保留为空数组。
 */
export const DEFAULT_Z_CALIBRATION: ZCalibrationConfig = {
  mode: 'none',
  zPositiveDirection: 'up',
  coarseStepMm: 0.5,
  fineStepMm: 0.1,
  maxProbeDistanceMm: 8,
  testLineCount: 4,
  testLineLengthMm: 12,
  testLineSpacingMm: 3,
  testDrawFeedRate: 800,
  zFeedRate: 500,
  points: [],
};

/**
 * 创建一个全新的项目文件。
 *
 * @returns PaperPlotter 的版本 1 项目结构。
 */
export function createDefaultProject(): ProjectFile {
  return {
    version: 1,
    paper: createPresetPaperConfig('A4', 'portrait'),
    calibration: {
      originOnPaper: 'top-left',
    },
    machine: DEFAULT_MACHINE_CONFIG,
    zCalibration: DEFAULT_Z_CALIBRATION,
    objects: [
      {
        id: 'test-rectangle-20mm',
        type: 'test-pattern',
        kind: 'rectangle',
        xMm: 20,
        yMm: 20,
        widthMm: 20,
        heightMm: 20,
      },
    ],
  };
}
