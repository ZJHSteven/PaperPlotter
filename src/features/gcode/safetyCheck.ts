import type { PointMm } from '../../types/geometry';
import type { GcodeJob, ValidationIssue, ValidationResult } from './gcodeTypes';

/**
 * G-code 作业安全检查。
 *
 * 第一版先检查“会不会生成明显危险或无效的文件”：
 * - 没有路径；
 * - 坐标不是有限数字；
 * - 路径点数不足；
 * - 超出机器工作区域；
 * - 落笔 Z 或速度参数不是有限数字。
 */
export function validateGcodeJob(job: GcodeJob): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (job.paths.length === 0) {
    issues.push({
      level: 'error',
      code: 'EMPTY_PATHS',
      message: '没有可导出的路径，请先添加测试图案或文本对象。',
    });
  }

  if (!Number.isFinite(job.machineConfig.penDownZ)) {
    issues.push({
      level: 'error',
      code: 'INVALID_PEN_DOWN_Z',
      message: '落笔 Z 不是有效数字，请先完成或手动设置 Z 标定。',
    });
  }

  checkPositiveFinite('空走速度', job.machineConfig.travelFeedRate, 'INVALID_TRAVEL_FEED', issues);
  checkPositiveFinite('绘制速度', job.machineConfig.drawFeedRate, 'INVALID_DRAW_FEED', issues);
  checkPositiveFinite('Z 抬笔速度', job.machineConfig.zTravelFeedRate, 'INVALID_Z_TRAVEL_FEED', issues);
  checkPositiveFinite('Z 落笔速度', job.machineConfig.zDrawFeedRate, 'INVALID_Z_DRAW_FEED', issues);

  job.paths.forEach((path, pathIndex) => {
    if (path.points.length < 2) {
      issues.push({
        level: 'error',
        code: 'PATH_TOO_SHORT',
        message: `第 ${pathIndex + 1} 条路径少于 2 个点，无法绘制。`,
      });
    }

    path.points.forEach((point, pointIndex) => {
      validatePoint(point, pathIndex, pointIndex, job, issues);
    });
  });

  return {
    ok: issues.every((issue) => issue.level !== 'error'),
    issues,
  };
}

function validatePoint(
  point: PointMm,
  pathIndex: number,
  pointIndex: number,
  job: GcodeJob,
  issues: ValidationIssue[],
) {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    issues.push({
      level: 'error',
      code: 'INVALID_POINT',
      message: `第 ${pathIndex + 1} 条路径第 ${pointIndex + 1} 个点不是有效坐标。`,
    });
    return;
  }

  if (
    point.x < 0 ||
    point.y < 0 ||
    point.x > job.machineConfig.workAreaWidthMm ||
    point.y > job.machineConfig.workAreaHeightMm
  ) {
    issues.push({
      level: 'error',
      code: 'POINT_OUT_OF_WORK_AREA',
      message: `第 ${pathIndex + 1} 条路径第 ${pointIndex + 1} 个点超出机器工作区域。`,
    });
  }
}

function checkPositiveFinite(
  label: string,
  value: number,
  code: string,
  issues: ValidationIssue[],
) {
  if (!Number.isFinite(value) || value <= 0) {
    issues.push({
      level: 'error',
      code,
      message: `${label}必须是大于 0 的有效数字。`,
    });
  }
}
