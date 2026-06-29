type SerialPortRequestOptions = {
  filters?: Array<{
    usbVendorId?: number;
    usbProductId?: number;
  }>;
};

type SerialOptions = {
  baudRate: number;
};

type SerialPortLike = {
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
  open: (options: SerialOptions) => Promise<void>;
  close: () => Promise<void>;
  getInfo?: () => {
    usbVendorId?: number;
    usbProductId?: number;
  };
};

type SerialNavigator = Navigator & {
  serial?: {
    requestPort: (options?: SerialPortRequestOptions) => Promise<SerialPortLike>;
    getPorts: () => Promise<SerialPortLike[]>;
  };
};

export type WebSerialConnection = {
  writeText: (content: string) => Promise<void>;
  close: () => Promise<void>;
};

export type AuthorizedSerialPort = {
  id: string;
  label: string;
  port: SerialPortLike;
};

/**
 * 判断当前浏览器是否暴露 Web Serial API。
 *
 * Web Serial 主要在 Chromium/Edge 这类浏览器中可用，并且需要安全上下文。
 * 本项目仍保留“复制 G-code 到外部 sender”的后备流程，所以不支持时只禁用串口按钮。
 */
export function isWebSerialSupported() {
  return typeof navigator !== 'undefined' && Boolean((navigator as SerialNavigator).serial);
}

/**
 * 读取浏览器已经授权过的串口。
 *
 * Web Serial 出于安全考虑，不能像桌面软件那样静默枚举所有 COM 口。
 * `getPorts()` 只能返回用户曾经授权给当前站点的端口；
 * 新端口仍必须通过 `requestPort()` 由用户在浏览器弹窗里手动选择。
 */
export async function listAuthorizedSerialPorts(): Promise<AuthorizedSerialPort[]> {
  const serial = (navigator as SerialNavigator).serial;

  if (!serial) {
    return [];
  }

  const ports = await serial.getPorts();

  return ports.map((port, index) => ({
    id: `authorized-${index}`,
    label: formatPortLabel(port, index),
    port,
  }));
}

/**
 * 请求用户选择新串口。
 *
 * 浏览器规范要求 requestPort 必须来自用户手势，所以调用方应把它放在按钮点击事件里。
 */
export async function requestWebSerialPort(): Promise<AuthorizedSerialPort> {
  const serial = (navigator as SerialNavigator).serial;

  if (!serial) {
    throw new Error('当前浏览器不支持 Web Serial，请继续使用外部 sender。');
  }

  const port = await serial.requestPort();

  return {
    id: `requested-${Date.now()}`,
    label: formatPortLabel(port, 0),
    port,
  };
}

/**
 * 打开指定串口并返回最小写入连接。
 *
 * 这里仍然只做 Z 标定和后续发送器的前置能力：
 * 写入文本 G-code，不实现完整 sender 所需的暂停、继续、队列和 GRBL `ok` 回读解析。
 */
export async function connectWebSerialPort(
  serialPort: AuthorizedSerialPort,
  baudRate: number,
): Promise<WebSerialConnection> {
  const port = serialPort.port;

  await port.open({ baudRate });

  return {
    writeText: async (content) => {
      if (!port.writable) {
        throw new Error('串口不可写，请重新连接设备。');
      }

      const writer = port.writable.getWriter();

      try {
        await writer.write(new TextEncoder().encode(content));
      } finally {
        writer.releaseLock();
      }
    },
    close: async () => {
      await port.close();
    },
  };
}

function formatPortLabel(port: SerialPortLike, index: number) {
  const info = port.getInfo?.();

  if (info?.usbVendorId !== undefined || info?.usbProductId !== undefined) {
    const vendorId = info.usbVendorId !== undefined ? toHexId(info.usbVendorId) : '未知厂商';
    const productId = info.usbProductId !== undefined ? toHexId(info.usbProductId) : '未知产品';

    return `已授权端口 ${index + 1}（USB ${vendorId}:${productId}）`;
  }

  return `已授权端口 ${index + 1}`;
}

function toHexId(value: number) {
  return value.toString(16).toUpperCase().padStart(4, '0');
}
