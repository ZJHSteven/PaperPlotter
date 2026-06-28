import { testPatternToPaths } from '../paths/testPatternToPaths';
import type { GcodeJob } from './gcodeTypes';
import type { ProjectFile } from '../../types/project';

/**
 * 从项目文件收集当前可导出的 G-code 作业。
 *
 * 第 4 步只支持测试图案。
 * 文本、照片标定和机器坐标旋转会在后续阶段逐步接入。
 */
export function projectToGcodeJob(project: ProjectFile): GcodeJob {
  const paths = project.objects.flatMap((object) => {
    if (object.type === 'test-pattern') {
      return testPatternToPaths(object);
    }

    return [];
  });

  return {
    paths,
    machineConfig: project.machine,
    zCalibration: project.zCalibration,
  };
}
