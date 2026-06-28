import type { Glyph } from './glyphTypes';
import { BasicChineseStrokeFontProvider } from './BasicChineseStrokeFontProvider';
import { FakeStrokeFontProvider } from './FakeStrokeFontProvider';

/**
 * 单线字体 provider 接口。
 *
 * 普通 TTF/OTF 往往是轮廓字形，不适合写字机直接走笔。
 * 本接口只返回 stroke paths，后续中文笔画 provider 也遵守同一接口。
 */
export interface StrokeFontProvider {
  id: string;
  name: string;
  supportsChar(char: string): boolean;
  getGlyph(char: string): Glyph | null;
}

export function getStrokeFontProvider(fontSource: string): StrokeFontProvider {
  if (fontSource === BasicChineseStrokeFontProvider.id) {
    return BasicChineseStrokeFontProvider;
  }

  return FakeStrokeFontProvider;
}
