import type { PointMm, PolylinePath } from '../../types/geometry';
import type { MachineConfig } from '../../types/project';
import type { GcodeJob } from './gcodeTypes';
import { validateGcodeJob } from './safetyCheck';

/**
 * 生成 G-code 文件文本。
 *
 * 运动策略严格按 MVP 计划书：
 * 1. 抬笔；
 * 2. 空走到路径起点；
 * 3. 落笔；
 * 4. 依次绘制路径点；
 * 5. 抬笔；
 * 6. 处理下一条路径。
 */
export function generateGcode(job: GcodeJob): string {
  const validation = validateGcodeJob(job);

  if (!validation.ok) {
    const messages = validation.issues.map((issue) => issue.message).join('\n');
    throw new Error(`G-code 作业未通过安全检查：\n${messages}`);
  }

  const lines: string[] = [];
  const headerLines = splitUserGcode(job.machineConfig.headerGcode);
  const footerLines = splitUserGcode(job.machineConfig.footerGcode);

  lines.push(...headerLines);
  lines.push('; PaperPlotter 导出文件');
  lines.push('; 运行前请手动将笔头移动到纸张左上角，并在外部 sender 执行 G92 X0 Y0');
  lines.push(renderPenCommand(job.machineConfig.penUpCommandTemplate, job.machineConfig.penUpZ, job.machineConfig.zTravelFeedRate));

  job.paths.forEach((path, index) => {
    appendPathGcode(lines, path, index, job.machineConfig);
  });

  lines.push(renderPenCommand(job.machineConfig.penUpCommandTemplate, job.machineConfig.penUpZ, job.machineConfig.zTravelFeedRate));
  lines.push(...footerLines);

  return `${lines.join('\n')}\n`;
}

function appendPathGcode(
  lines: string[],
  path: PolylinePath,
  index: number,
  machineConfig: MachineConfig,
) {
  const points = path.closed ? [...path.points, path.points[0]] : path.points;
  const start = points[0];

  lines.push('');
  lines.push(`; Path ${index + 1}`);
  lines.push(renderPenCommand(machineConfig.penUpCommandTemplate, machineConfig.penUpZ, machineConfig.zTravelFeedRate));
  lines.push(`G0 X${formatNumber(start.x)} Y${formatNumber(start.y)} F${formatNumber(machineConfig.travelFeedRate)}`);
  lines.push(renderPenCommand(machineConfig.penDownCommandTemplate, machineConfig.penDownZ, machineConfig.zDrawFeedRate));

  points.slice(1).forEach((point) => {
    lines.push(`G1 X${formatNumber(point.x)} Y${formatNumber(point.y)} F${formatNumber(machineConfig.drawFeedRate)}`);
  });

  lines.push(renderPenCommand(machineConfig.penUpCommandTemplate, machineConfig.penUpZ, machineConfig.zTravelFeedRate));
}

function renderPenCommand(template: string, z: number, feed: number) {
  return template
    .replaceAll('{z}', formatNumber(z))
    .replaceAll('{feed}', formatNumber(feed));
}

function splitUserGcode(gcode: string) {
  return gcode
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function formatNumber(value: number) {
  return Number(value.toFixed(3)).toString();
}
