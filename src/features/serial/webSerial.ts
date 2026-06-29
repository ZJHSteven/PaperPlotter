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
};

type SerialNavigator = Navigator & {
  serial?: {
    requestPort: (options?: SerialPortRequestOptions) => Promise<SerialPortLike>;
  };
};

export type WebSerialConnection = {
  writeText: (content: string) => Promise<void>;
  close: () => Promise<void>;
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
 * 请求用户选择串口并打开连接。
 *
 * 浏览器规范要求 requestPort 必须来自用户手势，所以调用方应把它放在按钮点击事件里。
 * 这里只做 Z 标定最小闭环：写入文本 G-code，不实现完整 sender 的暂停、继续、队列和回读解析。
 */
export async function requestWebSerialConnection(baudRate: number): Promise<WebSerialConnection> {
  const serial = (navigator as SerialNavigator).serial;

  if (!serial) {
    throw new Error('当前浏览器不支持 Web Serial，请继续使用外部 sender。');
  }

  const port = await serial.requestPort();
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
