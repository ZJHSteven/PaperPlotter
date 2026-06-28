import { describe, expect, it } from 'vitest';
import { FakeStrokeFontProvider } from '../fonts/FakeStrokeFontProvider';
import { BasicChineseStrokeFontProvider } from '../fonts/BasicChineseStrokeFontProvider';
import { textObjectToPaths } from './textToPaths';
import type { TextObject } from '../../types/project';

function makeTextObject(patch: Partial<TextObject> = {}): TextObject {
  return {
    id: 'text-1',
    type: 'text',
    xMm: 10,
    yMm: 20,
    widthMm: 80,
    rotationDeg: 0,
    text: 'AB',
    fontSource: 'fake-stroke',
    fontSizeMm: 10,
    letterSpacingMm: 1,
    lineHeightMm: 12,
    writingMode: 'horizontal',
    ...patch,
  };
}

describe('textObjectToPaths', () => {
  it('把文本转换成假字体单线路径', () => {
    const paths = textObjectToPaths(makeTextObject(), FakeStrokeFontProvider);

    expect(paths).toHaveLength(4);
    expect(paths[0].points[0]).toEqual({ x: 10, y: 20 });
    expect(paths[2].points[0].x).toBeCloseTo(18.2, 6);
  });

  it('空文本或非法字号不生成路径', () => {
    expect(textObjectToPaths(makeTextObject({ text: '' }), FakeStrokeFontProvider)).toEqual([]);
    expect(textObjectToPaths(makeTextObject({ fontSizeMm: 0 }), FakeStrokeFontProvider)).toEqual([]);
  });

  it('支持内置中文单线 provider', () => {
    const paths = textObjectToPaths(
      makeTextObject({
        text: '你好',
        fontSource: 'basic-chinese-stroke',
      }),
      BasicChineseStrokeFontProvider,
    );

    expect(BasicChineseStrokeFontProvider.supportsChar('你')).toBe(true);
    expect(BasicChineseStrokeFontProvider.supportsChar('好')).toBe(true);
    expect(paths.length).toBeGreaterThan(8);
  });
});
