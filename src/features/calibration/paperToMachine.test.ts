import { describe, expect, it } from 'vitest';
import { createPaperToMachineMatrix } from './machineAxis';
import { paperPathsToMachinePaths, paperPointToMachinePoint } from './paperToMachine';

describe('paperPointToMachinePoint', () => {
  it('使用机器参考线矩阵转换纸面点', () => {
    const matrix = createPaperToMachineMatrix(
      { x: 1, y: 0 },
      { yDirection: 'same-as-paper-down' },
    );

    expect(paperPointToMachinePoint({ x: 10, y: 20 }, { paperToMachineMatrix: matrix })).toEqual({
      x: 10,
      y: 20,
    });
  });

  it('支持旋转后的机器 X 轴', () => {
    const matrix = createPaperToMachineMatrix(
      { x: 0, y: 1 },
      { yDirection: 'same-as-paper-down' },
    );
    const point = paperPointToMachinePoint({ x: 10, y: 20 }, { paperToMachineMatrix: matrix });

    expect(point.x).toBeCloseTo(20, 6);
    expect(point.y).toBeCloseTo(-10, 6);
  });
});

describe('paperPathsToMachinePaths', () => {
  it('批量转换路径点并保留 closed 标记', () => {
    const matrix = createPaperToMachineMatrix(
      { x: 1, y: 0 },
      { yDirection: 'opposite-paper-down' },
    );
    const paths = paperPathsToMachinePaths(
      [
        {
          closed: true,
          points: [
            { x: 0, y: 0 },
            { x: 10, y: 20 },
          ],
        },
      ],
      { paperToMachineMatrix: matrix },
    );

    expect(paths).toEqual([
      {
        closed: true,
        points: [
          { x: 0, y: 0 },
          { x: 10, y: -20 },
        ],
      },
    ]);
  });
});
