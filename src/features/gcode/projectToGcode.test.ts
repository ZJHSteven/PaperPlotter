import { describe, expect, it } from 'vitest';
import { createDefaultProject } from '../../state/defaultProject';
import { createPaperToMachineMatrix } from '../calibration/machineAxis';
import { projectToGcodeJob } from './projectToGcode';

describe('projectToGcodeJob', () => {
  it('没有标定结果时按纸面坐标导出路径', () => {
    const project = createDefaultProject();
    const job = projectToGcodeJob(project);

    expect(job.paths[0].points[0]).toEqual({ x: 20, y: 20 });
  });

  it('存在标定结果时把纸面路径转换为机器路径', () => {
    const project = createDefaultProject();
    const matrix = createPaperToMachineMatrix(
      { x: 0, y: 1 },
      { yDirection: 'same-as-paper-down' },
    );
    const job = projectToGcodeJob({
      ...project,
      calibration: {
        ...project.calibration,
        result: {
          imageToPaperMatrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
          machineAxisAngleRad: Math.PI / 2,
          paperToMachineMatrix: matrix,
          calibratedAt: 1,
        },
      },
    });

    expect(job.paths[0].points[0].x).toBeCloseTo(20, 6);
    expect(job.paths[0].points[0].y).toBeCloseTo(-20, 6);
  });
});
