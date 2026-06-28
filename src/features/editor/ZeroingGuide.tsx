/**
 * 单点物理归零提示。
 *
 * PaperPlotter MVP 不直接控制机器，也不执行自动 home。
 * 所以导出前必须把手动归零步骤放在 UI 明显位置，防止用户直接运行 G-code 导致位置偏移。
 */
export function ZeroingGuide() {
  return (
    <section className="panel-section zeroing-guide" aria-label="G92 归零操作提示">
      <h2>运行前归零</h2>
      <ol className="step-list">
        <li>手动移动笔头到纸张左上角。</li>
        <li>
          在外部 sender 中执行 <code>G92 X0 Y0</code>。
        </li>
        <li>确认当前位置成为机器工作坐标原点后，再运行导出的 G-code。</li>
      </ol>
    </section>
  );
}
