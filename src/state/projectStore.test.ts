import { beforeEach, describe, expect, it } from 'vitest';
import { useProjectStore } from './projectStore';

describe('useProjectStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useProjectStore.getState().resetProject();
  });

  it('添加十字测试图案后自动选中新对象', () => {
    useProjectStore.getState().addTestPattern('cross');

    const state = useProjectStore.getState();
    const selectedObject = state.project.objects.find((object) => object.id === state.selectedObjectId);

    expect(state.project.objects).toHaveLength(2);
    expect(selectedObject).toMatchObject({
      type: 'test-pattern',
      kind: 'cross',
    });
  });

  it('拖动对象时把坐标限制在纸面内并保留两位小数', () => {
    useProjectStore.getState().moveObject('test-rectangle-20mm', 999.1234, -3);

    const object = useProjectStore
      .getState()
      .project.objects.find((item) => item.id === 'test-rectangle-20mm');

    expect(object).toMatchObject({
      xMm: 190,
      yMm: 0,
    });
  });

  it('依次添加四个纸角后生成 imageToPaper 标定结果', () => {
    const store = useProjectStore.getState();

    store.setCalibrationImageUrl('data:image/png;base64,stub');
    useProjectStore.getState().addPaperCornerPoint({ x: 0, y: 0 });
    useProjectStore.getState().addPaperCornerPoint({ x: 210, y: 0 });
    useProjectStore.getState().addPaperCornerPoint({ x: 210, y: 297 });
    useProjectStore.getState().addPaperCornerPoint({ x: 0, y: 297 });

    const calibration = useProjectStore.getState().project.calibration;

    expect(calibration.paperCornersPx).toMatchObject({
      topLeft: { x: 0, y: 0 },
      topRight: { x: 210, y: 0 },
      bottomRight: { x: 210, y: 297 },
      bottomLeft: { x: 0, y: 297 },
    });
    expect(calibration.result?.imageToPaperMatrix).toHaveLength(9);
  });
});
