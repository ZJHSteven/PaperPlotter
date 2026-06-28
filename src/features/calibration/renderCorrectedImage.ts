import type { HomographyMatrix } from '../../types/geometry';
import { applyHomographyToPoint, invertHomography } from './paperHomography';

/**
 * 把原始照片重采样成校正后的纸面背景。
 *
 * 实现思路：
 * 1. `imageToPaperMatrix` 能把照片 px 映射到纸面 mm；
 * 2. 背景渲染时需要反过来，对输出纸面上的每个像素，找它来自原照片哪个像素；
 * 3. 使用最近邻采样生成一张新的 data URL；
 * 4. SVG 再把这张校正后的图片按纸张毫米尺寸铺满。
 *
 * 这里没有引入 Canvas 作为主编辑器；Canvas 只作为一次性图片重采样工具。
 */
export async function renderCorrectedImage(options: {
  imageUrl: string;
  imageToPaperMatrix: HomographyMatrix;
  paperWidthMm: number;
  paperHeightMm: number;
  pixelsPerMm?: number;
}) {
  const pixelsPerMm = options.pixelsPerMm ?? 2;
  const outputWidth = Math.max(1, Math.round(options.paperWidthMm * pixelsPerMm));
  const outputHeight = Math.max(1, Math.round(options.paperHeightMm * pixelsPerMm));
  const image = await loadImage(options.imageUrl);
  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = image.naturalWidth;
  sourceCanvas.height = image.naturalHeight;
  const sourceContext = getCanvasContext(sourceCanvas);
  sourceContext.drawImage(image, 0, 0);
  const sourceData = sourceContext.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);

  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = outputWidth;
  outputCanvas.height = outputHeight;
  const outputContext = getCanvasContext(outputCanvas);
  const outputData = outputContext.createImageData(outputWidth, outputHeight);
  const paperToImageMatrix = invertHomography(options.imageToPaperMatrix);

  for (let y = 0; y < outputHeight; y += 1) {
    for (let x = 0; x < outputWidth; x += 1) {
      const paperX = (x / Math.max(1, outputWidth - 1)) * options.paperWidthMm;
      const paperY = (y / Math.max(1, outputHeight - 1)) * options.paperHeightMm;
      const sourcePoint = applyHomographyToPoint({ x: paperX, y: paperY }, paperToImageMatrix);
      copyNearestPixel(sourceData, outputData, sourcePoint.x, sourcePoint.y, x, y);
    }
  }

  outputContext.putImageData(outputData, 0, 0);

  return outputCanvas.toDataURL('image/png');
}

function loadImage(imageUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('照片加载失败，无法生成校正背景。'));
    image.src = imageUrl;
  });
}

function getCanvasContext(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('当前浏览器不支持 2D Canvas，无法生成校正背景。');
  }

  return context;
}

function copyNearestPixel(
  sourceData: ImageData,
  outputData: ImageData,
  sourceX: number,
  sourceY: number,
  outputX: number,
  outputY: number,
) {
  const roundedX = Math.round(sourceX);
  const roundedY = Math.round(sourceY);
  const outputIndex = (outputY * outputData.width + outputX) * 4;

  if (
    roundedX < 0 ||
    roundedY < 0 ||
    roundedX >= sourceData.width ||
    roundedY >= sourceData.height
  ) {
    outputData.data[outputIndex + 3] = 0;
    return;
  }

  const sourceIndex = (roundedY * sourceData.width + roundedX) * 4;
  outputData.data[outputIndex] = sourceData.data[sourceIndex];
  outputData.data[outputIndex + 1] = sourceData.data[sourceIndex + 1];
  outputData.data[outputIndex + 2] = sourceData.data[sourceIndex + 2];
  outputData.data[outputIndex + 3] = sourceData.data[sourceIndex + 3];
}
