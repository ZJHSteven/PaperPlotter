import { describe, expect, it } from 'vitest';
import { computeImageToPaperTransform } from './paperHomography';
import { computeMachineAxisInPaper, createPaperToMachineMatrix } from './machineAxis';
import type { PaperCornersPx } from '../../types/project';

const corners: PaperCornersPx = {
  topLeft: { x: 0, y: 0 },
  topRight: { x: 210, y: 0 },
  bottomRight: { x: 210, y: 297 },
  bottomLeft: { x: 0, y: 297 },
};

const calibration = {
  imageToPaperMatrix: computeImageToPaperTransform(corners, 210, 297),
};

describe('computeMachineAxisInPaper', () => {
  it('用户选择 X 轴参考线时直接得到机器 X 方向', () => {
    const axis = computeMachineAxisInPaper(
      { p1: { x: 10, y: 20 }, p2: { x: 110, y: 20 }, axis: 'x' },
      calibration,
    );

    expect(axis.machineXAxisDirection.x).toBeCloseTo(1, 6);
    expect(axis.machineXAxisDirection.y).toBeCloseTo(0, 6);
    expect(axis.angleRad).toBeCloseTo(0, 6);
  });

  it('用户选择 Y 轴参考线时旋转得到机器 X 方向', () => {
    const axis = computeMachineAxisInPaper(
      { p1: { x: 10, y: 20 }, p2: { x: 10, y: 120 }, axis: 'y' },
      calibration,
    );

    expect(axis.direction.x).toBeCloseTo(0, 6);
    expect(axis.direction.y).toBeCloseTo(1, 6);
    expect(axis.machineXAxisDirection.x).toBeCloseTo(1, 6);
    expect(axis.machineXAxisDirection.y).toBeCloseTo(0, 6);
  });

  it('拒绝过短参考线', () => {
    expect(() =>
      computeMachineAxisInPaper(
        { p1: { x: 10, y: 20 }, p2: { x: 10, y: 20 }, axis: 'x' },
        calibration,
      ),
    ).toThrow('机器参考线过短');
  });
});

describe('createPaperToMachineMatrix', () => {
  it('纸面水平 X 轴时生成单位方向矩阵', () => {
    const matrix = createPaperToMachineMatrix(
      { x: 1, y: 0 },
      { yDirection: 'same-as-paper-down' },
    );

    expect(matrix).toEqual({
      a: 1,
      b: -0,
      c: 0,
      d: 1,
      e: 0,
      f: 0,
    });
  });

  it('支持机器 Y 方向与纸面向下相反', () => {
    const matrix = createPaperToMachineMatrix(
      { x: 1, y: 0 },
      { yDirection: 'opposite-paper-down' },
    );

    expect(matrix.d).toBe(-1);
  });
});
