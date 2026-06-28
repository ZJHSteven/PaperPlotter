import { render, screen } from '@testing-library/react';
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

    await user.selectOptions(screen.getByLabelText('方向'), 'landscape');

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
    expect(screen.getByText('纸张尺寸：100 × 150 mm')).toBeInTheDocument();
  });

  it('可以添加十字测试图案并在检查面板显示路径数量', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: '添加十字' }));

    expect(screen.getByText('十字')).toBeInTheDocument();
    expect(screen.getByText('对象数量：2')).toBeInTheDocument();
    expect(screen.getByText('十字测试图案')).toBeInTheDocument();
    expect(screen.getByText('路径预览：当前对象会导出为 2 条折线路径。')).toBeInTheDocument();
  });
});
