import type { PolylinePath } from '../../types/geometry';
import type { MachineConfig, ZCalibrationConfig } from '../../types/project';

/**
 * G-code 生成相关类型。
 *
 * 这里刻意只依赖“机器路径”和“机器参数”，不依赖 React 或 SVG。
 * 后续照片标定完成后，只需要在进入此模块前把纸面路径转换为机器路径。
 */

export type GcodeJob = {
  paths: PolylinePath[];
  machineConfig: MachineConfig;
  zCalibration: ZCalibrationConfig;
};

export type ValidationIssue = {
  level: 'error' | 'warning';
  code: string;
  message: string;
};

export type ValidationResult = {
  ok: boolean;
  issues: ValidationIssue[];
};
