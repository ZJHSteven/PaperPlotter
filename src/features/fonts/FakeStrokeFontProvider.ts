import type { Glyph } from './glyphTypes';
import type { StrokeFontProvider } from './StrokeFontProvider';

/**
 * MVP 假字体。
 *
 * 它不是为了美观，而是为了验证“文本 -> 单线笔画路径 -> G-code”的数据闭环。
 * 除空格外，每个字符都用一个小矩形加中线表示，便于在纸上看出字符数量和排版位置。
 */
export const FakeStrokeFontProvider: StrokeFontProvider = {
  id: 'fake-stroke',
  name: 'Fake Stroke Font',
  supportsChar: () => true,
  getGlyph: (char): Glyph | null => {
    if (char === ' ') {
      return {
        char,
        advanceWidth: 0.45,
        strokes: [],
      };
    }

    return {
      char,
      advanceWidth: 0.72,
      strokes: [
        {
          points: [
            { x: 0, y: 0 },
            { x: 0.56, y: 0 },
            { x: 0.56, y: 1 },
            { x: 0, y: 1 },
            { x: 0, y: 0 },
          ],
        },
        {
          points: [
            { x: 0.12, y: 0.5 },
            { x: 0.44, y: 0.5 },
          ],
        },
      ],
    };
  },
};
