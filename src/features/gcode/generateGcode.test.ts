import { describe, expect, it } from 'vitest';
import { createDefaultProject } from '../../state/defaultProject';
import { generateGcode } from './generateGcode';
import { validateGcodeJob } from './safetyCheck';
import type { GcodeJob } from './gcodeTypes';

function createJob(patch: Partial<GcodeJob> = {}): GcodeJob {
  const project = createDefaultProject();

  return {
    paths: [
      {
        closed: true,
        points: [
          { x: 10, y: 20 },
          { x: 30, y: 20 },
          { x: 30, y: 40 },
          { x: 10, y: 40 },
        ],
      },
    ],
    machineConfig: project.machine,
    zCalibration: project.zCalibration,
    ...patch,
  };
}

describe('generateGcode', () => {
  it('按抬笔、空走、落笔、绘制、抬笔顺序生成 G-code', () => {
    const gcode = generateGcode(createJob());

    expect(gcode).toContain('G21');
    expect(gcode).toContain('G90');
    expect(gcode).toContain('G92 X0 Y0');
    expect(gcode).toContain('G0 Z5 F1000');
    expect(gcode).toContain('G0 X10 Y20 F3000');
    expect(gcode).toContain('G1 Z-1 F500');
    expect(gcode).toContain('G1 X30 Y20 F1200');
    expect(gcode).toContain('G1 X10 Y20 F1200');
    expect(gcode.endsWith('M2\n')).toBe(true);
  });

  it('安全检查失败时抛出错误，避免导出危险文件', () => {
    expect(() => generateGcode(createJob({ paths: [] }))).toThrow('没有可导出的路径');
  });
});

describe('validateGcodeJob', () => {
  it('拒绝 NaN 坐标和越界坐标', () => {
    const validation = validateGcodeJob(
      createJob({
        paths: [
          {
            points: [
              { x: Number.NaN, y: 0 },
              { x: 999, y: 0 },
            ],
          },
        ],
      }),
    );

    expect(validation.ok).toBe(false);
    expect(validation.issues.map((issue) => issue.code)).toContain('INVALID_POINT');
    expect(validation.issues.map((issue) => issue.code)).toContain('POINT_OUT_OF_WORK_AREA');
  });

  it('拒绝无效速度和无效落笔 Z', () => {
    const project = createDefaultProject();
    const validation = validateGcodeJob(
      createJob({
        machineConfig: {
          ...project.machine,
          drawFeedRate: 0,
          penDownZ: Number.NaN,
        },
      }),
    );

    expect(validation.ok).toBe(false);
    expect(validation.issues.map((issue) => issue.code)).toContain('INVALID_DRAW_FEED');
    expect(validation.issues.map((issue) => issue.code)).toContain('INVALID_PEN_DOWN_Z');
  });
});
