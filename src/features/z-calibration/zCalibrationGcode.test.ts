import { describe, expect, it } from 'vitest';
import { createDefaultProject } from '../../state/defaultProject';
import {
  generateCoarseDotProbeGcode,
  generateFineLineScanGcode,
  stepZTowardPaper,
} from './zCalibrationGcode';

describe('stepZTowardPaper', () => {
  it('Z 正方向向上时，下降一步会减小 Z', () => {
    expect(stepZTowardPaper(0, { zPositiveDirection: 'up', coarseStepMm: 0.5 })).toBe(-0.5);
  });

  it('Z 正方向向下时，下降一步会增大 Z', () => {
    expect(stepZTowardPaper(0, { zPositiveDirection: 'down', coarseStepMm: 0.5 })).toBe(0.5);
  });
});

describe('generateCoarseDotProbeGcode', () => {
  it('生成同一点点触测试 G-code', () => {
    const project = createDefaultProject();
    const gcode = generateCoarseDotProbeGcode(
      { x: 20, y: 30 },
      -0.5,
      project.zCalibration,
      project.machine,
    );

    expect(gcode).toContain('Z 粗找');
    expect(gcode).toContain('G0 X20 Y30 F3000');
    expect(gcode).toContain('G1 Z-0.5 F500');
    expect(gcode).toContain('G4 P0.15');
  });
});

describe('generateFineLineScanGcode', () => {
  it('围绕接触高度生成候选短线', () => {
    const project = createDefaultProject();
    const plan = generateFineLineScanGcode(
      { xMm: 20, yMm: 40, widthMm: 40, heightMm: 20 },
      -1,
      project.zCalibration,
      project.machine,
    );

    expect(plan.candidates).toHaveLength(4);
    expect(plan.candidates[0].path.points[0]).toEqual({ x: 20, y: 40 });
    expect(plan.candidates[3].path.points[1]).toEqual({ x: 32, y: 49 });
    expect(plan.gcode).toContain('Line 1');
    expect(plan.gcode).toContain('Line 4');
  });

  it('拒绝过多测试线，避免污染纸面', () => {
    const project = createDefaultProject();

    expect(() =>
      generateFineLineScanGcode(
        { xMm: 20, yMm: 40, widthMm: 40, heightMm: 20 },
        -1,
        { ...project.zCalibration, testLineCount: 8 },
        project.machine,
      ),
    ).toThrow('Z 细调线数量');
  });
});
