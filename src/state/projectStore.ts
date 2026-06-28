import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createDefaultProject, createPresetPaperConfig } from './defaultProject';
import { createId } from '../utils/id';
import type {
  DesignObject,
  MachineConfig,
  PaperConfig,
  PaperCornersPx,
  PaperPreset,
  ProjectFile,
  TestPatternObject,
} from '../types/project';
import type { ImagePoint } from '../types/geometry';
import { computeImageToPaperTransform } from '../features/calibration/paperHomography';

type ProjectStoreState = {
  project: ProjectFile;
  selectedObjectId?: string;
};

type ProjectStoreActions = {
  setPaperPreset: (preset: PaperPreset) => void;
  setPaperOrientation: (orientation: PaperConfig['orientation']) => void;
  setCustomPaperSize: (widthMm: number, heightMm: number) => void;
  updateMachineConfig: (patch: Partial<MachineConfig>) => void;
  setCalibrationImageUrl: (imageUrl: string, imageSizePx: { width: number; height: number }) => void;
  addPaperCornerPoint: (point: ImagePoint) => void;
  resetPaperCorners: () => void;
  addTestPattern: (kind: TestPatternObject['kind']) => void;
  selectObject: (objectId?: string) => void;
  updateObject: (objectId: string, patch: Partial<DesignObject>) => void;
  moveObject: (objectId: string, xMm: number, yMm: number) => void;
  resetProject: () => void;
};

export type ProjectStore = ProjectStoreState & ProjectStoreActions;

/**
 * 全局项目状态。
 *
 * Zustand 的 persist 中间件会把 project 保存到 localStorage。
 * 这样第 1 阶段就能满足“能保存基础 project state”的验收要求：
 * 刷新页面后，用户修改过的纸张配置仍然存在。
 */
export const useProjectStore = create<ProjectStore>()(
  persist(
    (set) => ({
      project: createDefaultProject(),
      selectedObjectId: 'test-rectangle-20mm',
      setPaperPreset: (preset) => {
        set((state) => {
          if (preset === 'custom') {
            return {
              project: {
                ...state.project,
                paper: {
                  ...state.project.paper,
                  preset,
                },
              },
            };
          }

          return {
            project: {
              ...state.project,
              paper: createPresetPaperConfig(preset, state.project.paper.orientation),
            },
          };
        });
      },
      setPaperOrientation: (orientation) => {
        set((state) => {
          if (state.project.paper.preset === 'custom') {
            return {
              project: {
                ...state.project,
                paper: {
                  ...state.project.paper,
                  orientation,
                },
              },
            };
          }

          return {
            project: {
              ...state.project,
              paper: createPresetPaperConfig(state.project.paper.preset, orientation),
            },
          };
        });
      },
      setCustomPaperSize: (widthMm, heightMm) => {
        set((state) => ({
          project: {
            ...state.project,
            paper: {
              preset: 'custom',
              orientation: state.project.paper.orientation,
              widthMm,
              heightMm,
            },
          },
        }));
      },
      updateMachineConfig: (patch) => {
        set((state) => ({
          project: {
            ...state.project,
            machine: {
              ...state.project.machine,
              ...patch,
            },
          },
        }));
      },
      setCalibrationImageUrl: (imageUrl, imageSizePx) => {
        set((state) => ({
          project: {
            ...state.project,
            calibration: {
              ...state.project.calibration,
              imageUrl,
              imageSizePx,
              paperCornersPx: undefined,
              result: undefined,
              errorMessage: undefined,
            },
          },
        }));
      },
      addPaperCornerPoint: (point) => {
        set((state) => {
          const nextCorners = addCornerToDraft(state.project.calibration.paperCornersPx, point);
          const hasAllCorners = Boolean(
            nextCorners.topLeft &&
              nextCorners.topRight &&
              nextCorners.bottomRight &&
              nextCorners.bottomLeft,
          );
          try {
            const result = hasAllCorners
              ? {
                  imageToPaperMatrix: computeImageToPaperTransform(
                    nextCorners as PaperCornersPx,
                    state.project.paper.widthMm,
                    state.project.paper.heightMm,
                  ),
                  machineAxisAngleRad: 0,
                  paperToMachineMatrix: {
                    a: 1,
                    b: 0,
                    c: 0,
                    d: 1,
                    e: 0,
                    f: 0,
                  },
                  calibratedAt: Date.now(),
                }
              : undefined;

            return {
              project: {
                ...state.project,
                calibration: {
                  ...state.project.calibration,
                  paperCornersPx: nextCorners as PaperCornersPx,
                  result,
                  errorMessage: undefined,
                },
              },
            };
          } catch (error) {
            return {
              project: {
                ...state.project,
                calibration: {
                  ...state.project.calibration,
                  paperCornersPx: nextCorners as PaperCornersPx,
                  result: undefined,
                  errorMessage: error instanceof Error ? error.message : '纸角标定失败。',
                },
              },
            };
          }
        });
      },
      resetPaperCorners: () => {
        set((state) => ({
          project: {
            ...state.project,
            calibration: {
              ...state.project.calibration,
              paperCornersPx: undefined,
              result: undefined,
              errorMessage: undefined,
            },
          },
        }));
      },
      addTestPattern: (kind) => {
        set((state) => {
          const object: TestPatternObject = {
            id: createId(`test-${kind}`),
            type: 'test-pattern',
            kind,
            xMm: 30 + state.project.objects.length * 8,
            yMm: 30 + state.project.objects.length * 8,
            widthMm: kind === 'line-scan' ? 30 : 20,
            heightMm: kind === 'line-scan' ? 9 : 20,
          };

          return {
            project: {
              ...state.project,
              objects: [...state.project.objects, object],
            },
            selectedObjectId: object.id,
          };
        });
      },
      selectObject: (objectId) => {
        set({ selectedObjectId: objectId });
      },
      updateObject: (objectId, patch) => {
        set((state) => ({
          project: {
            ...state.project,
            objects: state.project.objects.map((object) => {
              if (object.id !== objectId) {
                return object;
              }

              return normalizeDesignObject(
                { ...object, ...patch } as DesignObject,
                state.project.paper,
              );
            }),
          },
        }));
      },
      moveObject: (objectId, xMm, yMm) => {
        set((state) => ({
          project: {
            ...state.project,
            objects: state.project.objects.map((object) => {
              if (object.id !== objectId || !('xMm' in object) || !('yMm' in object)) {
                return object;
              }

              return normalizeDesignObject(
                { ...object, xMm, yMm } as DesignObject,
                state.project.paper,
              );
            }),
          },
        }));
      },
      resetProject: () => {
        set({ project: createDefaultProject(), selectedObjectId: 'test-rectangle-20mm' });
      },
    }),
    {
      name: 'paper-plotter-project-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ project: state.project }),
    },
  ),
);

function addCornerToDraft(
  current: Partial<PaperCornersPx> | undefined,
  point: ImagePoint,
): Partial<PaperCornersPx> {
  const draft = current ?? {};

  if (!draft.topLeft) {
    return { ...draft, topLeft: point };
  }

  if (!draft.topRight) {
    return { ...draft, topRight: point };
  }

  if (!draft.bottomRight) {
    return { ...draft, bottomRight: point };
  }

  if (!draft.bottomLeft) {
    return { ...draft, bottomLeft: point };
  }

  return { topLeft: point };
}

/**
 * 规范化对象坐标和尺寸。
 *
 * UI 拖动会产生浮点数，用户输入也可能暂时给出异常值。
 * 这里统一做三件事：
 * 1. 非数字值退回到 0，避免 NaN 混入项目文件；
 * 2. 尺寸最小保留 0.1mm，避免不可见或无法导出的图案；
 * 3. 位置限制在纸面内，避免 MVP 早期就生成明显越界路径。
 */
function normalizeDesignObject(object: DesignObject, paper: PaperConfig): DesignObject {
  if (object.type !== 'test-pattern') {
    return object;
  }

  const widthMm = normalizePositiveMm(object.widthMm, 0.1);
  const heightMm = normalizePositiveMm(object.heightMm, 0.1);
  const maxX = Math.max(0, paper.widthMm - widthMm);
  const maxY = Math.max(0, paper.heightMm - heightMm);
  const xMm = clamp(roundMm(Number(object.xMm) || 0), 0, maxX);
  const yMm = clamp(roundMm(Number(object.yMm) || 0), 0, maxY);

  return {
    ...object,
    xMm,
    yMm,
    widthMm,
    heightMm,
  };
}

function normalizePositiveMm(value: number, min: number) {
  const numericValue = Number.isFinite(value) ? value : min;

  return Math.max(min, roundMm(numericValue));
}

function roundMm(value: number) {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
