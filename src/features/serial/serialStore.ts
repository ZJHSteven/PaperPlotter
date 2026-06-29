import { create } from 'zustand';
import {
  connectWebSerialPort,
  isWebSerialSupported,
  listAuthorizedSerialPorts,
  requestWebSerialPort,
  type AuthorizedSerialPort,
  type WebSerialConnection,
} from './webSerial';

type SerialConnectionState = 'unsupported' | 'disconnected' | 'connecting' | 'connected' | 'error';

type SerialStoreState = {
  baudRate: number;
  ports: AuthorizedSerialPort[];
  selectedPortId?: string;
  status: SerialConnectionState;
  statusMessage: string;
  connectedPortLabel?: string;
  log: string[];
  connection?: WebSerialConnection;
};

type SerialStoreActions = {
  setBaudRate: (baudRate: number) => void;
  selectPort: (portId: string) => void;
  refreshAuthorizedPorts: () => Promise<void>;
  requestPortAndSelect: () => Promise<void>;
  connectSelectedPort: () => Promise<void>;
  disconnect: () => Promise<void>;
  writeText: (content: string) => Promise<void>;
};

export type SerialStore = SerialStoreState & SerialStoreActions;

/**
 * Web Serial 连接状态。
 *
 * 串口连接不是项目文件的一部分，不能持久化到 localStorage：
 * 1. 浏览器刷新后真实串口连接会断开；
 * 2. `SerialPort` 对象不能 JSON 序列化；
 * 3. 用户可能同时打开外部 sender，占用同一个 COM 口。
 *
 * 因此这里用一个独立的内存 Zustand store，让右侧 Z 标定面板和底部状态栏共享同一份连接状态。
 */
export const useSerialStore = create<SerialStore>((set, get) => ({
  baudRate: 115200,
  ports: [],
  status: isWebSerialSupported() ? 'disconnected' : 'unsupported',
  statusMessage: isWebSerialSupported()
    ? '未连接串口'
    : '当前浏览器不支持 Web Serial',
  log: [],
  setBaudRate: (baudRate) => set({ baudRate }),
  selectPort: (portId) => set({ selectedPortId: portId }),
  refreshAuthorizedPorts: async () => {
    if (!isWebSerialSupported()) {
      set({ status: 'unsupported', statusMessage: '当前浏览器不支持 Web Serial' });
      return;
    }

    const ports = await listAuthorizedSerialPorts();
    set((state) => ({
      ports,
      selectedPortId: state.selectedPortId ?? ports[0]?.id,
      statusMessage: ports.length > 0 ? `发现 ${ports.length} 个已授权端口` : '暂无已授权端口，请先选择端口',
    }));
  },
  requestPortAndSelect: async () => {
    try {
      const port = await requestWebSerialPort();
      set((state) => ({
        ports: [port, ...state.ports.filter((item) => item.id !== port.id)],
        selectedPortId: port.id,
        status: 'disconnected',
        statusMessage: `已选择：${port.label}`,
        log: prependLog(state.log, `已选择串口：${port.label}`),
      }));
    } catch (error) {
      set((state) => ({
        status: 'error',
        statusMessage: normalizeSerialError(error, '选择串口失败'),
        log: prependLog(state.log, normalizeSerialError(error, '选择串口失败')),
      }));
    }
  },
  connectSelectedPort: async () => {
    const state = get();
    const selectedPort = state.ports.find((port) => port.id === state.selectedPortId);

    if (!selectedPort) {
      set({ status: 'error', statusMessage: '请先选择一个已授权串口' });
      return;
    }

    try {
      set({ status: 'connecting', statusMessage: `正在连接：${selectedPort.label}` });
      const connection = await connectWebSerialPort(selectedPort, state.baudRate);
      set((current) => ({
        connection,
        connectedPortLabel: selectedPort.label,
        status: 'connected',
        statusMessage: `${selectedPort.label} 已连接，${current.baudRate} baud`,
        log: prependLog(current.log, `已连接：${selectedPort.label}`),
      }));
    } catch (error) {
      set((current) => ({
        status: 'error',
        statusMessage: normalizeSerialError(error, '连接串口失败'),
        log: prependLog(current.log, normalizeSerialError(error, '连接串口失败')),
      }));
    }
  },
  disconnect: async () => {
    const connection = get().connection;

    try {
      await connection?.close();
      set((state) => ({
        connection: undefined,
        connectedPortLabel: undefined,
        status: isWebSerialSupported() ? 'disconnected' : 'unsupported',
        statusMessage: '串口已断开',
        log: prependLog(state.log, '串口已断开'),
      }));
    } catch (error) {
      set((state) => ({
        status: 'error',
        statusMessage: normalizeSerialError(error, '断开串口失败'),
        log: prependLog(state.log, normalizeSerialError(error, '断开串口失败')),
      }));
    }
  },
  writeText: async (content) => {
    const connection = get().connection;

    if (!connection) {
      set({ status: 'error', statusMessage: '请先连接串口' });
      return;
    }

    try {
      await connection.writeText(content.endsWith('\n') ? content : `${content}\n`);
      set((state) => ({
        status: 'connected',
        statusMessage: `已发送 ${content.split('\n').filter(Boolean).length} 行 G-code`,
        log: prependLog(state.log, `已发送 ${content.split('\n').filter(Boolean).length} 行 G-code`),
      }));
    } catch (error) {
      set((state) => ({
        status: 'error',
        statusMessage: normalizeSerialError(error, '发送 G-code 失败'),
        log: prependLog(state.log, normalizeSerialError(error, '发送 G-code 失败')),
      }));
    }
  },
}));

function prependLog(currentLog: string[], message: string) {
  return [`${new Date().toLocaleTimeString()} ${message}`, ...currentLog].slice(0, 8);
}

function normalizeSerialError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
