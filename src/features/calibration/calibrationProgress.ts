import type { PaperCornersPx } from '../../types/project';

export const PAPER_CORNER_LABELS = {
  topLeft: '左上角',
  topRight: '右上角',
  bottomRight: '右下角',
  bottomLeft: '左下角',
} as const;

export type PaperCornerKey = keyof typeof PAPER_CORNER_LABELS;

const CORNER_ORDER: PaperCornerKey[] = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'];

/**
 * 计算下一步应该点选哪个纸角。
 *
 * 这个小函数让 UI 不需要知道四角顺序细节，也方便单元测试覆盖。
 */
export function getNextPaperCornerKey(corners?: Partial<PaperCornersPx>) {
  return CORNER_ORDER.find((key) => !corners?.[key]);
}

export function getPaperCornerCount(corners?: Partial<PaperCornersPx>) {
  return CORNER_ORDER.filter((key) => Boolean(corners?.[key])).length;
}
