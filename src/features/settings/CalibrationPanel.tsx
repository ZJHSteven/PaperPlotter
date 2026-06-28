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

  function handleFileChange(file?: File) {
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCalibrationImageUrl(reader.result);
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

      <p className="hint">
        {calibration.imageUrl
          ? nextCornerKey
            ? `请在纸面预览中点击：${PAPER_CORNER_LABELS[nextCornerKey]}（${cornerCount}/4）`
            : '四个纸角已点完，已计算 imageToPaper 透视矩阵。'
          : '先导入一张纸张照片，再按左上、右上、右下、左下点选四角。'}
      </p>

      {calibration.paperCornersPx ? (
        <button className="secondary-button full-width" type="button" onClick={resetPaperCorners}>
          重置纸角
        </button>
      ) : null}
    </section>
  );
}
