const DB_NAME = 'paper-plotter-assets';
const DB_VERSION = 1;
const IMAGE_STORE = 'calibration-images';

export type StoredCalibrationImage = {
  id: string;
  fileName: string;
  mimeType: string;
  blob: Blob;
  savedAt: number;
};

/**
 * 打开 PaperPlotter 的浏览器二进制资源库。
 *
 * localStorage 只适合保存少量字符串配置，不适合保存真实照片。
 * IndexedDB 可以直接保存 Blob，因此照片不会经历 base64 转码，也不会膨胀体积。
 */
export function openImageDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('当前浏览器不支持 IndexedDB，无法保存纸张照片。'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(IMAGE_STORE)) {
        database.createObjectStore(IMAGE_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('打开图片数据库失败。'));
  });
}

/**
 * 保存用户导入的纸张照片 Blob。
 *
 * 返回的 id 会进入项目 JSON；真正的二进制照片留在 IndexedDB。
 * 后续刷新页面时，只要 id 还在，就可以从 IndexedDB 重新取出 Blob 并生成 object URL。
 */
export async function saveCalibrationImageBlob(file: File): Promise<StoredCalibrationImage> {
  const database = await openImageDatabase();
  const record: StoredCalibrationImage = {
    id: `image-${Date.now()}-${crypto.randomUUID()}`,
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    blob: file,
    savedAt: Date.now(),
  };

  await runImageStoreRequest(database, 'readwrite', (store) => store.put(record));
  database.close();

  return record;
}

/**
 * 读取已经保存的纸张照片 Blob。
 *
 * 如果用户清理了浏览器站点数据，IndexedDB 记录可能不存在。
 * 这种情况下返回 undefined，让 UI 提示用户重新导入照片。
 */
export async function loadCalibrationImageBlob(id: string): Promise<StoredCalibrationImage | undefined> {
  const database = await openImageDatabase();
  const record = await runImageStoreRequest<StoredCalibrationImage | undefined>(
    database,
    'readonly',
    (store) => store.get(id),
  );

  database.close();

  return record;
}

function runImageStoreRequest<T>(
  database: IDBDatabase,
  mode: IDBTransactionMode,
  createRequest: (store: IDBObjectStore) => IDBRequest<T>,
) {
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(IMAGE_STORE, mode);
    const store = transaction.objectStore(IMAGE_STORE);
    const request = createRequest(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('图片数据库操作失败。'));
    transaction.onerror = () => reject(transaction.error ?? new Error('图片数据库事务失败。'));
  });
}
