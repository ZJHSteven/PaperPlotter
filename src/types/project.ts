import type {
  HomographyMatrix,
  ImagePoint,
  Matrix2D,
  PointMm,
  PolylinePath,
} from './geometry';

/**
 * 项目文件结构。
 *
 * 这些类型刻意贴近 `计划书.md`，这样后续保存/加载项目文件时不会再重做模型。
 * 第一阶段只使用其中一部分字段，但完整骨架先保留，避免后续功能反复迁移状态。
 */

export type PaperPreset = 'A4' | 'A5' | 'B5' | 'custom';

export type PaperOrientation = 'portrait' | 'landscape';

export type PaperConfig = {
  preset: PaperPreset;
  widthMm: number;
  heightMm: number;
  orientation: PaperOrientation;
};

export type PaperCornersPx = {
  topLeft: ImagePoint;
  topRight: ImagePoint;
  bottomRight: ImagePoint;
  bottomLeft: ImagePoint;
};

export type MachineAxisLinePx = {
  p1: ImagePoint;
  p2: ImagePoint;
  axis: 'x' | 'y';
};

export type CalibrationResult = {
  imageToPaperMatrix: HomographyMatrix;
  machineAxisAngleRad: number;
  paperToMachineMatrix: Matrix2D;
  calibratedAt: number;
};

export type CalibrationConfig = {
  imageUrl?: string;
  imageSizePx?: {
    width: number;
    height: number;
  };
  paperCornersPx?: PaperCornersPx;
  machineAxisLineDraftPx?: {
    p1?: ImagePoint;
    p2?: ImagePoint;
    axis: 'x' | 'y';
  };
  machineAxisLinePx?: MachineAxisLinePx;
  originOnPaper: 'top-left';
  result?: CalibrationResult;
  errorMessage?: string;
};

export type ZCalibrationPoint = {
  paperX: number;
  paperY: number;
  penDownZ: number;
};

export type ZCalibrationConfig = {
  mode: 'none' | 'single-point' | 'multi-point';
  zPositiveDirection: 'up' | 'down';
  basePenDownZ?: number;
  coarseStepMm: number;
  fineStepMm: number;
  maxProbeDistanceMm: number;
  testLineCount: number;
  testLineLengthMm: number;
  testLineSpacingMm: number;
  testDrawFeedRate: number;
  zFeedRate: number;
  testArea?: {
    xMm: number;
    yMm: number;
    widthMm: number;
    heightMm: number;
  };
  points: ZCalibrationPoint[];
};

export type MachineConfig = {
  workAreaWidthMm: number;
  workAreaHeightMm: number;
  yDirection: 'same-as-paper-down' | 'opposite-paper-down';
  zPositiveDirection: 'up' | 'down';
  travelFeedRate: number;
  drawFeedRate: number;
  testDrawFeedRate: number;
  zTravelFeedRate: number;
  zDrawFeedRate: number;
  penUpZ: number;
  penDownZ: number;
  penUpCommandTemplate: string;
  penDownCommandTemplate: string;
  headerGcode: string;
  footerGcode: string;
};

export type TextObject = {
  id: string;
  type: 'text';
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm?: number;
  rotationDeg: number;
  text: string;
  fontSource: string;
  fontSizeMm: number;
  letterSpacingMm: number;
  lineHeightMm: number;
  writingMode: 'horizontal' | 'vertical';
};

export type PathObject = {
  id: string;
  type: 'path';
  xMm: number;
  yMm: number;
  rotationDeg: number;
  scale: number;
  paths: PolylinePath[];
};

export type TestPatternObject = {
  id: string;
  type: 'test-pattern';
  kind: 'rectangle' | 'cross' | 'grid' | 'line-scan';
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
};

export type DesignObject = TextObject | PathObject | TestPatternObject;

export type ProjectFile = {
  version: 1;
  paper: PaperConfig;
  calibration: CalibrationConfig;
  machine: MachineConfig;
  zCalibration: ZCalibrationConfig;
  objects: DesignObject[];
};
