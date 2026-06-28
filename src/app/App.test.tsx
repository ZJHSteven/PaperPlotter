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
});
