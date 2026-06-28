import { describe, expect, it } from 'vitest';
import { getNextPaperCornerKey, getPaperCornerCount } from './calibrationProgress';

describe('calibrationProgress', () => {
  it('按左上、右上、右下、左下顺序推进', () => {
    expect(getNextPaperCornerKey()).toBe('topLeft');
    expect(getNextPaperCornerKey({ topLeft: { x: 1, y: 1 } })).toBe('topRight');
    expect(
      getNextPaperCornerKey({
        topLeft: { x: 1, y: 1 },
        topRight: { x: 2, y: 1 },
        bottomRight: { x: 2, y: 2 },
      }),
    ).toBe('bottomLeft');
  });

  it('统计已经点选的纸角数量', () => {
    expect(getPaperCornerCount()).toBe(0);
    expect(getPaperCornerCount({ topLeft: { x: 1, y: 1 }, topRight: { x: 2, y: 1 } })).toBe(2);
  });
});
