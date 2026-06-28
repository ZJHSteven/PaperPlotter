import { useRef } from 'react';
import { useProjectStore } from '../../state/projectStore';
import {
  getNextPaperCornerKey,
  getPaperCornerCount,
  PAPER_CORNER_LABELS,
} from '../calibration/calibrationProgress';
import type { CalibrationConfig } from '../../types/project';

type CalibrationPanelProps = {
  calibration: CalibrationConfig;
};

/**
 * 照片标定面板。
 *
 * 文件读取只在浏览器本地完成，不上传任何图片。
 * 读到的 data URL 会进入 project state，用作 SVG 纸面背景。
 */
export function CalibrationPanel({ calibration }: CalibrationPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const setCalibrationImageUrl = useProjectStore((state) => state.setCalibrationImageUrl);
  const resetPaperCorners = useProjectStore((state) => state.resetPaperCorners);
  const nextCornerKey = getNextPaperCornerKey(calibration.paperCornersPx);
  const cornerCount = getPaperCornerCount(calibration.paperCornersPx);
  const showDevTestImageButton = import.meta.env.MODE !== 'production';

  function handleFileChange(file?: File) {
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const image = new Image();
        image.onload = () => {
          setCalibrationImageUrl(reader.result as string, {
            width: image.naturalWidth,
            height: image.naturalHeight,
          });
        };
        image.src = reader.result;
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <section className="panel-section">
      <h2>照片标定</h2>
      <input
        ref={inputRef}
        className="hidden-file-input"
        type="file"
        accept="image/*"
        onChange={(event) => handleFileChange(event.target.files?.[0])}
      />
      <button className="secondary-button full-width" type="button" onClick={() => inputRef.current?.click()}>
        导入纸张照片
      </button>
      {showDevTestImageButton ? (
        <button className="secondary-button full-width dev-only-button" type="button" onClick={loadDevTestImage}>
          载入测试照片
        </button>
      ) : null}

      <p className="hint">
        {calibration.imageUrl
          ? nextCornerKey
            ? `请在照片标定视图中点击：${PAPER_CORNER_LABELS[nextCornerKey]}（${cornerCount}/4）`
            : '四个纸角已点完，已计算 imageToPaper 透视矩阵。'
          : '先导入一张纸张照片，再按左上、右上、右下、左下点选四角。'}
      </p>
      {calibration.imageSizePx ? (
        <p className="meta-text">
          照片尺寸：{calibration.imageSizePx.width} × {calibration.imageSizePx.height} px
        </p>
      ) : null}
      {calibration.errorMessage ? <p className="error-text">{calibration.errorMessage}</p> : null}

      {calibration.paperCornersPx ? (
        <button className="secondary-button full-width" type="button" onClick={resetPaperCorners}>
          重置纸角
        </button>
      ) : null}
    </section>
  );

  /**
   * 载入内置测试照片。
   *
   * 这个按钮只在开发/测试环境显示，作用是让自动化浏览器能绕过系统文件选择器，
   * 但仍然走真实的 project store、照片尺寸、四角点选和 homography 计算链路。
   */
  function loadDevTestImage() {
    setCalibrationImageUrl(createDevCalibrationImageUrl(), {
      width: 400,
      height: 300,
    });
  }
}

function createDevCalibrationImageUrl() {
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">',
    '<rect width="400" height="300" fill="#f8fafc"/>',
    '<polygon points="40,30 360,50 345,270 55,250" fill="#ffffff" stroke="#111827" stroke-width="6"/>',
    '<text x="135" y="155" font-size="28" fill="#2563eb">Paper Test</text>',
    '</svg>',
  ].join('');

  return `data:image/svg+xml;base64,${window.btoa(svg)}`;
}
