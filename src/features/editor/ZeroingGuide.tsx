/**
 * 单点物理归零提示。
 *
 * PaperPlotter MVP 不直接控制机器，也不执行自动 home。
 * 所以导出前必须把手动归零步骤放在 UI 明显位置，防止用户直接运行 G-code 导致位置偏移。
 */
export function ZeroingGuide() {
  return (
    <section className="panel-section zeroing-guide" aria-label="G92 归零操作提示">
      <h2>归零 / 设置工作原点</h2>
      <p className="mini-help">将笔尖移动到纸张左上角内侧位置后，执行下方命令。</p>
      <button className="command-button" type="button">
        <code>G92 X0 Y0</code>
      </button>
      <p className="origin-status">原点已设置：X0.00 Y0.00</p>
    </section>
  );
}
