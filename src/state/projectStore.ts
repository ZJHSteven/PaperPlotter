import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createDefaultProject, createPresetPaperConfig } from './defaultProject';
import type { MachineConfig, PaperConfig, PaperPreset, ProjectFile } from '../types/project';

type ProjectStoreState = {
  project: ProjectFile;
};

type ProjectStoreActions = {
  setPaperPreset: (preset: PaperPreset) => void;
  setPaperOrientation: (orientation: PaperConfig['orientation']) => void;
  setCustomPaperSize: (widthMm: number, heightMm: number) => void;
  updateMachineConfig: (patch: Partial<MachineConfig>) => void;
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
      resetProject: () => {
        set({ project: createDefaultProject() });
      },
    }),
    {
      name: 'paper-plotter-project-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ project: state.project }),
    },
  ),
);
