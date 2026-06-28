import type { PolylinePath } from '../../types/geometry';
import type { TextObject } from '../../types/project';
import type { StrokeFontProvider } from '../fonts/StrokeFontProvider';

/**
 * 把文本对象转换为单线折线路径。
 *
 * 当前 MVP 使用假字体，核心目标是验证文本对象也能走通预览和 G-code 导出。
 * 后续接入中文笔画字库时，只需要替换 provider，不需要改导出器。
 */
export function textObjectToPaths(
  object: TextObject,
  fontProvider: StrokeFontProvider,
): PolylinePath[] {
  if (!object.text || object.fontSizeMm <= 0) {
    return [];
  }

  const paths: PolylinePath[] = [];
  const lines = object.text.split('\n');
  const angleRad = (object.rotationDeg / 180) * Math.PI;

  lines.forEach((line, lineIndex) => {
    let cursorX = 0;
    const lineY = lineIndex * object.lineHeightMm;

    Array.from(line).forEach((char) => {
      const glyph = fontProvider.getGlyph(char);

      if (!glyph) {
        return;
      }

      glyph.strokes.forEach((stroke) => {
        paths.push({
          points: stroke.points.map((point) => {
            const localX = cursorX + point.x * object.fontSizeMm;
            const localY = lineY + point.y * object.fontSizeMm;

            return rotateAndTranslate(localX, localY, object.xMm, object.yMm, angleRad);
          }),
        });
      });

      cursorX += glyph.advanceWidth * object.fontSizeMm + object.letterSpacingMm;
    });
  });

  return paths;
}

function rotateAndTranslate(
  localX: number,
  localY: number,
  originX: number,
  originY: number,
  angleRad: number,
) {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);

  return {
    x: originX + localX * cos - localY * sin,
    y: originY + localX * sin + localY * cos,
  };
}
