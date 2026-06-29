import { useRef } from 'react';
import { useProjectStore } from '../../state/projectStore';
import { saveCalibrationImageBlob } from '../storage/imageStorage';
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
  const setCalibrationImageFromStorage = useProjectStore((state) => state.setCalibrationImageFromStorage);
  const setCalibrationError = useProjectStore((state) => state.setCalibrationError);
  const resetPaperCorners = useProjectStore((state) => state.resetPaperCorners);
  const setMachineAxisReferenceAxis = useProjectStore((state) => state.setMachineAxisReferenceAxis);
  const resetMachineAxisLine = useProjectStore((state) => state.resetMachineAxisLine);
  const nextCornerKey = getNextPaperCornerKey(calibration.paperCornersPx);
  const cornerCount = getPaperCornerCount(calibration.paperCornersPx);
  const imageImported = Boolean(calibration.imageUrl || calibration.imageId);
  const cornersDone = cornerCount === 4 && Boolean(calibration.result);
  const showDevTestImageButton = import.meta.env.MODE === 'test';
  const machineAxisDraft = calibration.machineAxisLineDraftPx ?? { axis: 'x' as const };
  const machineAxisPointCount = Number(Boolean(machineAxisDraft.p1)) + Number(Boolean(machineAxisDraft.p2));

  function handleFileChange(file?: File) {
    if (!file) {
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = async () => {
      try {
        const storedImage = await saveCalibrationImageBlob(file);
        setCalibrationImageFromStorage(
          {
            imageId: storedImage.id,
            imageUrl: previewUrl,
            imageFileName: storedImage.fileName,
            imageMimeType: storedImage.mimeType,
          },
          {
            width: image.naturalWidth,
            height: image.naturalHeight,
          },
        );
      } catch (error) {
        URL.revokeObjectURL(previewUrl);
        setCalibrationError(error instanceof Error ? error.message : '保存纸张照片失败。');
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(previewUrl);
      setCalibrationError(
        file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')
          ? '当前浏览器不能直接解码 HEIC/HEIF 照片，请先转换为 JPG、PNG 或 WebP 后再导入。'
          : '当前浏览器无法解码这张图片，请换用 JPG、PNG 或 WebP 格式。',
      );
    };
    image.src = previewUrl;
  }

  return (
    <section className="panel-section">
      <h2>标定（照片校准）</h2>
      <input
        ref={inputRef}
        className="hidden-file-input"
        type="file"
        accept="image/*"
        onChange={(event) => handleFileChange(event.target.files?.[0])}
      />
      <ol className="calibration-steps" aria-label="照片标定步骤">
        <CalibrationStep
          actionLabel={imageImported ? '完成' : '导入'}
          done={imageImported}
          index={1}
          meta={calibration.imageFileName ?? '支持 JPG、PNG、WebP；HEIC 需浏览器可解码'}
          onAction={imageImported ? undefined : () => inputRef.current?.click()}
          title="拍照并导入"
        />
        <CalibrationStep
          actionLabel={cornersDone ? '完成' : '待做'}
          done={cornersDone}
          index={2}
          meta={cornersDone ? '已设置 4 / 4' : `已设置 ${cornerCount} / 4`}
          onAction={calibration.paperCornersPx ? resetPaperCorners : undefined}
          title="设置四个角点"
        />
        <CalibrationStep
          actionLabel={cornersDone ? '完成' : '待做'}
          done={cornersDone}
          index={3}
          meta={cornersDone ? '透视校正已应用' : '四角完成后自动计算'}
          title="校正纸张"
        />
      </ol>

      {showDevTestImageButton ? (
        <button className="secondary-button full-width dev-only-button compact-button" type="button" onClick={loadDevTestImage}>
          载入测试照片
        </button>
      ) : null}

      {nextCornerKey && imageImported ? (
        <p className="hint">下一步：切换“纸角”工具，点击 {PAPER_CORNER_LABELS[nextCornerKey]}（{cornerCount}/4）。</p>
      ) : null}
      {calibration.imageSizePx ? <p className="meta-text">照片尺寸：{calibration.imageSizePx.width} × {calibration.imageSizePx.height} px</p> : null}
      {calibration.errorMessage ? <p className="error-text">{calibration.errorMessage}</p> : null}

      <div className="sub-panel machine-reference-panel">
        <h3>机器参考线（笔架行程）</h3>
        <label className="field">
          <span>类型</span>
          <select
            disabled={!calibration.result}
            value={machineAxisDraft.axis}
            onChange={(event) => setMachineAxisReferenceAxis(event.target.value as 'x' | 'y')}
          >
            <option value="x">水平线（机器 X 轴）</option>
            <option value="y">垂直线（机器 Y 轴）</option>
          </select>
        </label>
        <p className="hint">
          {calibration.machineAxisLinePx
            ? '机器参考线已标定，已写入纸面到机器方向映射。'
            : calibration.result
              ? `请在纸面预览中点击机器参考线两端（${machineAxisPointCount}/2）。`
              : '请先完成纸张四角标定。'}
        </p>
        {calibration.machineAxisLineDraftPx || calibration.machineAxisLinePx ? (
          <button className="secondary-button full-width compact-button" type="button" onClick={resetMachineAxisLine}>
            重置机器参考线
          </button>
        ) : null}
      </div>
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

function CalibrationStep({
  actionLabel,
  done,
  index,
  meta,
  onAction,
  title,
}: {
  actionLabel: string;
  done: boolean;
  index: number;
  meta: string;
  onAction?: () => void;
  title: string;
}) {
  return (
    <li className={done ? 'calibration-step calibration-step--done' : 'calibration-step'}>
      <span className="calibration-step__badge">{done ? '✓' : index}</span>
      <span>
        <strong>{title}</strong>
        <small>{meta}</small>
      </span>
      <button disabled={!onAction && !done} type="button" onClick={onAction}>
        {actionLabel}
      </button>
    </li>
  );
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
