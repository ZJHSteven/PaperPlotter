import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { useProjectStore } from '../state/projectStore';

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    useProjectStore.getState().resetProject();
  });

  it('渲染编辑器主界面和默认 A4 纸张信息', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: '写字机纸面排版与 G-code 生成工具' })).toBeInTheDocument();
    expect(screen.getByText('210 mm × 297 mm，SVG 坐标单位 = mm')).toBeInTheDocument();
    expect(screen.getByText('20mm 方框')).toBeInTheDocument();
  });

  it('切换 A4 横向后画布尺寸随项目状态更新', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: '横向' }));

    expect(screen.getByText('297 mm × 210 mm，SVG 坐标单位 = mm')).toBeInTheDocument();
  });

  it('支持通过视图工具缩放并重置 SVG 画布', async () => {
    const user = userEvent.setup();

    render(<App />);

    expect(screen.getByText('100%')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '放大画布' }));

    expect(screen.getByText('125%')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '重置视图' }));

    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('自定义纸张尺寸后画布和导出检查同步显示新尺寸', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.clear(screen.getByRole('spinbutton', { name: '宽度 mm' }));
    await user.type(screen.getByRole('spinbutton', { name: '宽度 mm' }), '100');
    await user.clear(screen.getByRole('spinbutton', { name: '高度 mm' }));
    await user.type(screen.getByRole('spinbutton', { name: '高度 mm' }), '150');

    expect(screen.getByText('100 mm × 150 mm，SVG 坐标单位 = mm')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '导出' }));
    expect(screen.getByText('纸张尺寸：100 × 150 mm')).toBeInTheDocument();
  });

  it('可以通过顶栏绘制按钮添加测试图案并在检查面板显示路径数量', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: '绘制' }));

    expect(screen.getByText('路径预览：当前对象会导出为 1 条折线路径。')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '导出' }));
    expect(screen.getByText('对象数量：2')).toBeInTheDocument();
    expect(screen.getByText('可导出路径：2')).toBeInTheDocument();
  });

  it('可以添加测试文本并把文本路径计入导出路径', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: '文字' }));

    expect(screen.getByText('文本对象')).toBeInTheDocument();
    expect(screen.getByDisplayValue('TEST')).toBeInTheDocument();
    expect(screen.getByText('文本：TEST')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '导出' }));
    expect(screen.getByText('可导出路径：9')).toBeInTheDocument();
  });

  it('可以添加中文示例并使用中文单线 provider', async () => {
    const user = userEvent.setup();

    useProjectStore.getState().addChineseSampleTextObject();
    render(<App />);

    expect(screen.getByDisplayValue('实验报告')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: '字体来源' })).toHaveValue('basic-chinese-stroke');
    expect(screen.getByText('文本：实验报告')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '导出' }));
    expect(screen.getByText('可导出路径：24')).toBeInTheDocument();
  });

  it('点击导出按钮后显示已生成 G-code 状态', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: '导出 G-code' }));
    await user.click(screen.getByRole('button', { name: '导出' }));

    expect(screen.getByText('已生成 G-code：1 条路径。')).toBeInTheDocument();
  });

  it('显示运行前 G92 归零操作提示', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: '导出' }));

    expect(screen.getByRole('region', { name: 'G92 归零操作提示' })).toBeInTheDocument();
    expect(screen.getByText('将笔尖移动到纸张左上角内侧位置后，执行下方命令。')).toBeInTheDocument();
    expect(screen.getByText('G92 X0 Y0')).toBeInTheDocument();
    expect(screen.getByText('原点已设置：X0.00 Y0.00')).toBeInTheDocument();
  });

  it('可以生成 Z 粗找和细调 G-code 并保存候选落笔 Z', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Z 标定' }));
    await user.click(screen.getByRole('button', { name: '下降一步并点一下' }));

    expect(screen.getByDisplayValue(/Z 粗找/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '看到墨点，进入细调' }));

    expect(screen.getByDisplayValue(/Z 细调/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /选第 1 条/ }));

    expect(screen.getByLabelText('已保存落笔 Z')).toHaveValue('-1.35');
    expect(useProjectStore.getState().project.zCalibration.basePenDownZ).toBe(-1.35);
    expect(useProjectStore.getState().project.machine.penDownZ).toBe(-1.35);
  });

  it('暴露 MVP 要求的关键机器参数设置', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: '机器' }));

    for (const label of [
      '工作区宽 mm',
      '工作区高 mm',
      'Y 轴方向',
      'Z 轴正方向',
      '空走速度',
      '绘制速度',
      '测试写字速度',
      'Z 抬笔速度',
      'Z 落笔速度',
      '抬笔高度',
      '落笔高度',
      '抬笔命令模板',
      '落笔命令模板',
      'G-code 文件开头命令',
      'G-code 文件结尾命令',
    ]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
  });

  it('暴露单点 Z 标定要求的可调参数', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Z 标定' }));

    for (const label of [
      '粗找步长 mm',
      '细调步长 mm',
      '最大下降范围 mm',
      '细调线数量',
      '测试线长度 mm',
      '测试线间距 mm',
      '测试速度',
      'Z 轴移动速度',
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByDisplayValue('当前浏览器不支持 Web Serial')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '连接' })).toBeDisabled();
  });

  it('显示照片标定入口和当前点选提示', () => {
    render(<App />);

    expect(screen.getByRole('button', { name: '导入' })).toBeInTheDocument();
    expect(screen.getByText('拍照并导入')).toBeInTheDocument();
    expect(screen.getByText('设置四个角点')).toBeInTheDocument();
    expect(screen.getByText('校正纸张')).toBeInTheDocument();
  });

  it('导入照片后画布进入照片像素标定模式', () => {
    useProjectStore.getState().setCalibrationImageUrl('data:image/svg+xml;base64,stub', {
      width: 400,
      height: 300,
    });

    render(<App />);

    expect(screen.getByText('400 px × 300 px，点击坐标 = 照片 px')).toBeInTheDocument();
    expect(screen.getByText('下一步：切换“纸角”工具，点击 左上角（0/4）。')).toBeInTheDocument();
    expect(screen.getByText('照片尺寸：400 × 300 px')).toBeInTheDocument();
  });

  it('提供显式工具栏并支持切换纸角标定工具', async () => {
    const user = userEvent.setup();

    render(<App />);

    expect(screen.getByRole('button', { name: '选择' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '移动' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '纸角' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '纸角' }));

    expect(screen.getByText('工具：纸角标定')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '纸张毫米坐标预览' })).toHaveAttribute(
      'data-tool',
      'paper-corners',
    );
  });

  it('支持撤销和重做项目内对象变更', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: '绘制' }));

    expect(useProjectStore.getState().project.objects).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: '撤销' }));

    expect(useProjectStore.getState().project.objects).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: '重做' }));

    expect(useProjectStore.getState().project.objects).toHaveLength(2);
  });

  it('画布滚轮缩放不需要 Ctrl 键', () => {
    render(<App />);

    const svg = screen.getByRole('img', { name: '纸张毫米坐标预览' });

    fireEvent.wheel(svg, { deltaY: -100 });

    return waitFor(() => expect(screen.getByText('110%')).toBeInTheDocument());
  });

  it('四角点选完成后回到纸面毫米预览并显示标定完成提示', () => {
    const store = useProjectStore.getState();
    store.setCalibrationImageUrl('data:image/svg+xml;base64,stub', {
      width: 400,
      height: 300,
    });
    useProjectStore.getState().addPaperCornerPoint({ x: 20, y: 10 });
    useProjectStore.getState().addPaperCornerPoint({ x: 380, y: 20 });
    useProjectStore.getState().addPaperCornerPoint({ x: 370, y: 290 });
    useProjectStore.getState().addPaperCornerPoint({ x: 30, y: 280 });

    render(<App />);

    expect(screen.getByText('210 mm × 297 mm，SVG 坐标单位 = mm')).toBeInTheDocument();
    expect(screen.getByText('已设置 4 / 4')).toBeInTheDocument();
    expect(screen.getByText('透视校正已应用')).toBeInTheDocument();
    expect(screen.getByText('机器参考线（笔架行程）')).toBeInTheDocument();
    expect(screen.getByText('请在纸面预览中点击机器参考线两端（0/2）。')).toBeInTheDocument();
    expect(useProjectStore.getState().project.calibration.result?.imageToPaperMatrix).toHaveLength(9);
  });
});
