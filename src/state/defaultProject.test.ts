import { describe, expect, it } from 'vitest';
import { createDefaultProject, createPresetPaperConfig } from './defaultProject';

describe('createPresetPaperConfig', () => {
  it('按纵向返回 A4 标准尺寸', () => {
    expect(createPresetPaperConfig('A4', 'portrait')).toMatchObject({
      preset: 'A4',
      orientation: 'portrait',
      widthMm: 210,
      heightMm: 297,
    });
  });

  it('按横向交换纸张宽高', () => {
    expect(createPresetPaperConfig('A4', 'landscape')).toMatchObject({
      preset: 'A4',
      orientation: 'landscape',
      widthMm: 297,
      heightMm: 210,
    });
  });
});

describe('createDefaultProject', () => {
  it('创建版本 1 项目并包含一个 20mm 方框测试对象', () => {
    const project = createDefaultProject();

    expect(project.version).toBe(1);
    expect(project.paper.widthMm).toBe(210);
    expect(project.objects).toHaveLength(1);
    expect(project.objects[0]).toMatchObject({
      type: 'test-pattern',
      kind: 'rectangle',
      widthMm: 20,
      heightMm: 20,
    });
  });
});
