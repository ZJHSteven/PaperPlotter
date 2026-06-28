import { describe, expect, it } from 'vitest';
import { testPatternToPaths } from './testPatternToPaths';
import type { TestPatternObject } from '../../types/project';

function makePattern(patch: Partial<TestPatternObject>): TestPatternObject {
  return {
    id: 'pattern-1',
    type: 'test-pattern',
    kind: 'rectangle',
    xMm: 10,
    yMm: 20,
    widthMm: 20,
    heightMm: 10,
    ...patch,
  };
}

describe('testPatternToPaths', () => {
  it('把矩形测试图案转换为闭合路径', () => {
    const paths = testPatternToPaths(makePattern({ kind: 'rectangle' }));

    expect(paths).toEqual([
      {
        closed: true,
        points: [
          { x: 10, y: 20 },
          { x: 30, y: 20 },
          { x: 30, y: 30 },
          { x: 10, y: 30 },
        ],
      },
    ]);
  });

  it('把十字测试图案转换为两条中心线', () => {
    const paths = testPatternToPaths(makePattern({ kind: 'cross' }));

    expect(paths).toEqual([
      {
        points: [
          { x: 10, y: 25 },
          { x: 30, y: 25 },
        ],
      },
      {
        points: [
          { x: 20, y: 20 },
          { x: 20, y: 30 },
        ],
      },
    ]);
  });

  it('遇到非正尺寸时返回空路径，避免后续导出非法 G-code', () => {
    expect(testPatternToPaths(makePattern({ widthMm: 0 }))).toEqual([]);
    expect(testPatternToPaths(makePattern({ heightMm: -1 }))).toEqual([]);
  });
});
