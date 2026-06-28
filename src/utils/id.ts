/**
 * ID 工具。
 *
 * 浏览器端不能依赖 Node 的 crypto 模块。
 * 这里优先使用现代浏览器的 `crypto.randomUUID()`，测试环境或旧环境中再退回到时间戳。
 */

export function createId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
