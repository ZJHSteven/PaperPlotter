import type { PointMm } from '../../types/geometry';

export type Glyph = {
  char: string;
  advanceWidth: number;
  strokes: GlyphStroke[];
};

export type GlyphStroke = {
  points: PointMm[];
};
