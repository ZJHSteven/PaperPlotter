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
import type { ImagePoint, PaperPoint } from '../types/geometry';
import {
  applyHomographyToPoint,
  computeImageToPaperTransform,
  invertHomography,
} from '../features/calibration/paperHomography';
import {
  computeMachineAxisInPaper,
  createPaperToMachineMatrix,
} from '../features/calibration/machineAxis';

type ProjectStoreState = {
  project: ProjectFile;
  selectedObjectId?: string;
  history: {
    past: ProjectSnapshot[];
    future: ProjectSnapshot[];
  };
};

type ProjectSnapshot = {
  project: ProjectFile;
  selectedObjectId?: string;
};

type ProjectStoreActions = {
  setPaperPreset: (preset: PaperPreset) => void;
  setPaperOrientation: (orientation: PaperConfig['orientation']) => void;
  setCustomPaperSize: (widthMm: number, heightMm: number) => void;
  updateMachineConfig: (patch: Partial<MachineConfig>) => void;
  setCalibrationImageUrl: (imageUrl: string, imageSizePx: { width: number; height: number }) => void;
  setCalibrationImageFromStorage: (
    image: {
      imageId: string;
      imageUrl: string;
      imageFileName: string;
      imageMimeType: string;
    },
    imageSizePx: { width: number; height: number },
  ) => void;
  restoreCalibrationImageUrl: (imageUrl: string) => void;
  setCalibrationError: (message: string) => void;
  addPaperCornerPoint: (point: ImagePoint) => void;
  resetPaperCorners: () => void;
  setMachineAxisReferenceAxis: (axis: 'x' | 'y') => void;
  addMachineAxisPointFromPaper: (point: PaperPoint) => void;
  resetMachineAxisLine: () => void;
  updateZCalibrationConfig: (patch: Partial<ProjectFile['zCalibration']>) => void;
  saveBasePenDownZ: (z: number) => void;
  addTestPattern: (kind: TestPatternObject['kind']) => void;
  addTextObject: () => void;
  addChineseSampleTextObject: () => void;
  selectObject: (objectId?: string) => void;
  updateObject: (objectId: string, patch: Partial<DesignObject>) => void;
  moveObject: (objectId: string, xMm: number, yMm: number) => void;
  undo: () => void;
  redo: () => void;
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
      history: {
        past: [],
        future: [],
      },
      setPaperPreset: (preset) => {
        set((state) => {
          if (preset === 'custom') {
            return commitProjectChange(state, {
              ...state.project,
              paper: {
                ...state.project.paper,
                preset,
              },
            });
          }

          return commitProjectChange(state, {
            ...state.project,
            paper: createPresetPaperConfig(preset, state.project.paper.orientation),
          });
        });
      },
      setPaperOrientation: (orientation) => {
        set((state) => {
          if (state.project.paper.preset === 'custom') {
            return commitProjectChange(state, {
              ...state.project,
              paper: {
                ...state.project.paper,
                orientation,
              },
            });
          }

          return commitProjectChange(state, {
            ...state.project,
            paper: createPresetPaperConfig(state.project.paper.preset, orientation),
          });
        });
      },
      setCustomPaperSize: (widthMm, heightMm) => {
        set((state) =>
          commitProjectChange(state, {
            ...state.project,
            paper: {
              preset: 'custom',
              orientation: state.project.paper.orientation,
              widthMm,
              heightMm,
            },
          }),
        );
      },
      updateMachineConfig: (patch) => {
        set((state) =>
          commitProjectChange(state, {
            ...state.project,
            machine: {
              ...state.project.machine,
              ...patch,
            },
            zCalibration: patch.zPositiveDirection
              ? {
                  ...state.project.zCalibration,
                  zPositiveDirection: patch.zPositiveDirection,
                }
              : state.project.zCalibration,
          }),
        );
      },
      setCalibrationImageUrl: (imageUrl, imageSizePx) => {
        set((state) =>
          commitProjectChange(state, {
            ...state.project,
            calibration: {
              ...state.project.calibration,
              imageId: undefined,
              imageUrl,
              imageFileName: undefined,
              imageMimeType: undefined,
              imageSizePx,
              paperCornersPx: undefined,
              machineAxisLineDraftPx: undefined,
              machineAxisLinePx: undefined,
              result: undefined,
              errorMessage: undefined,
            },
          }),
        );
      },
      setCalibrationImageFromStorage: (image, imageSizePx) => {
        set((state) =>
          commitProjectChange(state, {
            ...state.project,
            calibration: {
              ...state.project.calibration,
              imageId: image.imageId,
              imageUrl: image.imageUrl,
              imageFileName: image.imageFileName,
              imageMimeType: image.imageMimeType,
              imageSizePx,
              paperCornersPx: undefined,
              machineAxisLineDraftPx: undefined,
              machineAxisLinePx: undefined,
              result: undefined,
              errorMessage: undefined,
            },
          }),
        );
      },
      restoreCalibrationImageUrl: (imageUrl) => {
        set((state) => ({
          project: {
            ...state.project,
            calibration: {
              ...state.project.calibration,
              imageUrl,
              errorMessage: undefined,
            },
          },
        }));
      },
      setCalibrationError: (message) => {
        set((state) => ({
          project: {
            ...state.project,
            calibration: {
              ...state.project.calibration,
              errorMessage: message,
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

            return commitProjectChange(state, {
              ...state.project,
              calibration: {
                ...state.project.calibration,
                paperCornersPx: nextCorners as PaperCornersPx,
                result,
                errorMessage: undefined,
              },
            });
          } catch (error) {
            return commitProjectChange(state, {
              ...state.project,
              calibration: {
                ...state.project.calibration,
                paperCornersPx: nextCorners as PaperCornersPx,
                result: undefined,
                errorMessage: error instanceof Error ? error.message : '纸角标定失败。',
              },
            });
          }
        });
      },
      resetPaperCorners: () => {
        set((state) =>
          commitProjectChange(state, {
            ...state.project,
            calibration: {
              ...state.project.calibration,
              paperCornersPx: undefined,
              machineAxisLineDraftPx: undefined,
              machineAxisLinePx: undefined,
              result: undefined,
              errorMessage: undefined,
            },
          }),
        );
      },
      setMachineAxisReferenceAxis: (axis) => {
        set((state) =>
          commitProjectChange(state, {
            ...state.project,
            calibration: {
              ...state.project.calibration,
              machineAxisLineDraftPx: {
                axis,
              },
              machineAxisLinePx: undefined,
            },
          }),
        );
      },
      addMachineAxisPointFromPaper: (point) => {
        set((state) => {
          const calibration = state.project.calibration;

          if (!calibration.result) {
            return state;
          }

          try {
            const paperToImageMatrix = invertHomography(calibration.result.imageToPaperMatrix);
            const imagePoint = applyHomographyToPoint(point, paperToImageMatrix);
            const draft = calibration.machineAxisLineDraftPx ?? { axis: 'x' as const };
            const nextDraft = !draft.p1
              ? { ...draft, p1: imagePoint }
              : !draft.p2
                ? { ...draft, p2: imagePoint }
                : { axis: draft.axis, p1: imagePoint };

            if (!nextDraft.p1 || !nextDraft.p2) {
              return commitProjectChange(state, {
                ...state.project,
                calibration: {
                  ...calibration,
                  machineAxisLineDraftPx: nextDraft,
                  machineAxisLinePx: undefined,
                  errorMessage: undefined,
                },
              });
            }

            const machineAxisLinePx = {
              p1: nextDraft.p1,
              p2: nextDraft.p2,
              axis: nextDraft.axis,
            };
            const machineAxis = computeMachineAxisInPaper(machineAxisLinePx, calibration.result);
            const paperToMachineMatrix = createPaperToMachineMatrix(
              machineAxis.machineXAxisDirection,
              state.project.machine,
            );

            return commitProjectChange(state, {
              ...state.project,
              calibration: {
                ...calibration,
                machineAxisLineDraftPx: nextDraft,
                machineAxisLinePx,
                result: {
                  ...calibration.result,
                  machineAxisAngleRad: machineAxis.angleRad,
                  paperToMachineMatrix,
                  calibratedAt: Date.now(),
                },
                errorMessage: undefined,
              },
            });
          } catch (error) {
            return commitProjectChange(state, {
              ...state.project,
              calibration: {
                ...calibration,
                errorMessage: error instanceof Error ? error.message : '机器参考线标定失败。',
              },
            });
          }
        });
      },
      resetMachineAxisLine: () => {
        set((state) =>
          commitProjectChange(state, {
            ...state.project,
            calibration: {
              ...state.project.calibration,
              machineAxisLineDraftPx: undefined,
              machineAxisLinePx: undefined,
              result: state.project.calibration.result
                ? {
                    ...state.project.calibration.result,
                    machineAxisAngleRad: 0,
                    paperToMachineMatrix: {
                      a: 1,
                      b: 0,
                      c: 0,
                      d: 1,
                      e: 0,
                      f: 0,
                    },
                  }
                : undefined,
              errorMessage: undefined,
            },
          }),
        );
      },
      updateZCalibrationConfig: (patch) => {
        set((state) =>
          commitProjectChange(state, {
            ...state.project,
            machine: patch.zPositiveDirection
              ? {
                  ...state.project.machine,
                  zPositiveDirection: patch.zPositiveDirection,
                }
              : state.project.machine,
            zCalibration: {
              ...state.project.zCalibration,
              ...patch,
            },
          }),
        );
      },
      saveBasePenDownZ: (z) => {
        set((state) =>
          commitProjectChange(state, {
            ...state.project,
            machine: {
              ...state.project.machine,
              penDownZ: z,
            },
            zCalibration: {
              ...state.project.zCalibration,
              mode: 'single-point',
              basePenDownZ: z,
              points: [
                {
                  paperX: state.project.zCalibration.testArea?.xMm ?? 20,
                  paperY: state.project.zCalibration.testArea?.yMm ?? 20,
                  penDownZ: z,
                },
              ],
            },
          }),
        );
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

          return commitProjectChange(
            state,
            {
              ...state.project,
              objects: [...state.project.objects, object],
            },
            object.id,
          );
        });
      },
      addTextObject: () => {
        set((state) => {
          const object = {
            id: createId('text'),
            type: 'text' as const,
            xMm: 30,
            yMm: 70,
            widthMm: 90,
            rotationDeg: 0,
            text: 'TEST',
            fontSource: 'fake-stroke',
            fontSizeMm: 10,
            letterSpacingMm: 1,
            lineHeightMm: 12,
            writingMode: 'horizontal' as const,
          };

          return commitProjectChange(
            state,
            {
              ...state.project,
              objects: [...state.project.objects, object],
            },
            object.id,
          );
        });
      },
      addChineseSampleTextObject: () => {
        set((state) => {
          const object = {
            id: createId('text-zh'),
            type: 'text' as const,
            xMm: 30,
            yMm: 95,
            widthMm: 120,
            rotationDeg: 0,
            text: '实验报告',
            fontSource: 'basic-chinese-stroke',
            fontSizeMm: 12,
            letterSpacingMm: 2,
            lineHeightMm: 16,
            writingMode: 'horizontal' as const,
          };

          return commitProjectChange(
            state,
            {
              ...state.project,
              objects: [...state.project.objects, object],
            },
            object.id,
          );
        });
      },
      selectObject: (objectId) => {
        set({ selectedObjectId: objectId });
      },
      updateObject: (objectId, patch) => {
        set((state) =>
          commitProjectChange(state, {
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
          }),
        );
      },
      moveObject: (objectId, xMm, yMm) => {
        set((state) =>
          commitProjectChange(state, {
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
          }),
        );
      },
      undo: () => {
        set((state) => {
          const previous = state.history.past.at(-1);

          if (!previous) {
            return state;
          }

          return {
            project: previous.project,
            selectedObjectId: previous.selectedObjectId,
            history: {
              past: state.history.past.slice(0, -1),
              future: [snapshotProjectState(state), ...state.history.future].slice(0, 50),
            },
          };
        });
      },
      redo: () => {
        set((state) => {
          const next = state.history.future[0];

          if (!next) {
            return state;
          }

          return {
            project: next.project,
            selectedObjectId: next.selectedObjectId,
            history: {
              past: [...state.history.past, snapshotProjectState(state)].slice(-50),
              future: state.history.future.slice(1),
            },
          };
        });
      },
      resetProject: () => {
        set({
          project: createDefaultProject(),
          selectedObjectId: 'test-rectangle-20mm',
          history: {
            past: [],
            future: [],
          },
        });
      },
    }),
    {
      name: 'paper-plotter-project-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        project: {
          ...state.project,
          calibration: {
            ...state.project.calibration,
            imageUrl: undefined,
          },
        },
      }),
    },
  ),
);

/**
 * 提交一次会改变项目文件的操作，并把旧项目放入撤销栈。
 *
 * 这里记录的是完整 `ProjectFile` 快照，而不是记录“反向补丁”。
 * 对初版工具来说，项目文件体量很小，快照方案更直观，也能统一覆盖：
 * 纸张设置、照片导入、纸角点选、机器参考线、对象修改和 Z 参数保存。
 */
function commitProjectChange(
  state: ProjectStoreState,
  project: ProjectFile,
  selectedObjectId = state.selectedObjectId,
) {
  return {
    project,
    selectedObjectId,
    history: {
      past: [...state.history.past, snapshotProjectState(state)].slice(-50),
      future: [],
    },
  };
}

function snapshotProjectState(state: ProjectStoreState): ProjectSnapshot {
  return {
    project: state.project,
    selectedObjectId: state.selectedObjectId,
  };
}

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
