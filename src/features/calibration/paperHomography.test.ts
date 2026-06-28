import { describe, expect, it } from 'vitest';
import { applyHomographyToPoint, computeImageToPaperTransform } from './paperHomography';
import type { PaperCornersPx } from '../../types/project';

function expectPointClose(actual: { x: number; y: number }, expected: { x: number; y: number }) {
  expect(actual.x).toBeCloseTo(expected.x, 6);
  expect(actual.y).toBeCloseTo(expected.y, 6);
}

describe('computeImageToPaperTransform', () => {
  it('把矩形照片坐标映射到 A4 纸面毫米坐标', () => {
    const corners: PaperCornersPx = {
      topLeft: { x: 100, y: 50 },
      topRight: { x: 310, y: 50 },
      bottomRight: { x: 310, y: 347 },
      bottomLeft: { x: 100, y: 347 },
    };

    const matrix = computeImageToPaperTransform(corners, 210, 297);

    expectPointClose(applyHomographyToPoint(corners.topLeft, matrix), { x: 0, y: 0 });
    expectPointClose(applyHomographyToPoint(corners.topRight, matrix), { x: 210, y: 0 });
    expectPointClose(applyHomographyToPoint(corners.bottomRight, matrix), { x: 210, y: 297 });
    expectPointClose(applyHomographyToPoint(corners.bottomLeft, matrix), { x: 0, y: 297 });
  });

  it('支持歪斜照片中的四边形纸张', () => {
    const corners: PaperCornersPx = {
      topLeft: { x: 80, y: 40 },
      topRight: { x: 330, y: 70 },
      bottomRight: { x: 300, y: 360 },
      bottomLeft: { x: 60, y: 320 },
    };

    const matrix = computeImageToPaperTransform(corners, 210, 297);

    expectPointClose(applyHomographyToPoint(corners.topLeft, matrix), { x: 0, y: 0 });
    expectPointClose(applyHomographyToPoint(corners.bottomRight, matrix), { x: 210, y: 297 });
  });

  it('拒绝无效纸张尺寸和退化四角', () => {
    const corners: PaperCornersPx = {
      topLeft: { x: 0, y: 0 },
      topRight: { x: 1, y: 1 },
      bottomRight: { x: 2, y: 2 },
      bottomLeft: { x: 3, y: 3 },
    };

    expect(() => computeImageToPaperTransform(corners, 0, 297)).toThrow('纸张尺寸');
    expect(() => computeImageToPaperTransform(corners, 210, 297)).toThrow('面积过小');
  });
});
