import { useProjectStore } from '../../state/projectStore';
import { testPatternToPaths } from '../paths/testPatternToPaths';
import type { DesignObject, TestPatternObject } from '../../types/project';

type SelectionPanelProps = {
  object?: DesignObject;
};

/**
 * 选中对象检查面板。
 *
 * 第 3 步只支持测试图案对象。
 * 这里显示对象位置、尺寸和转换后的路径数量，方便确认“预览对象”和“未来 G-code 路径”是同一份数据。
 */
export function SelectionPanel({ object }: SelectionPanelProps) {
  const updateObject = useProjectStore((state) => state.updateObject);

  if (!object) {
    return (
      <section className="panel-section">
        <h2>选中对象</h2>
        <p className="empty-state">当前没有选中对象。点击纸面上的测试图案可选中。</p>
      </section>
    );
  }

  if (object.type !== 'test-pattern') {
    if (object.type === 'text') {
      return <TextSelectionPanel object={object} />;
    }

    return null;
  }

  const paths = testPatternToPaths(object);

  return (
    <section className="panel-section">
      <h2>选中对象</h2>
      <p className="object-title">{getPatternName(object.kind)}</p>

      <div className="field-grid">
        <NumberField label="X mm" value={object.xMm} onChange={(value) => updateObject(object.id, { xMm: value })} />
        <NumberField label="Y mm" value={object.yMm} onChange={(value) => updateObject(object.id, { yMm: value })} />
      </div>

      <div className="field-grid">
        <NumberField
          label="宽 mm"
          value={object.widthMm}
          onChange={(value) => updateObject(object.id, { widthMm: value })}
        />
        <NumberField
          label="高 mm"
          value={object.heightMm}
          onChange={(value) => updateObject(object.id, { heightMm: value })}
        />
      </div>

      <p className="hint">路径预览：当前对象会导出为 {paths.length} 条折线路径。</p>
    </section>
  );
}

function TextSelectionPanel({ object }: { object: Extract<DesignObject, { type: 'text' }> }) {
  const updateObject = useProjectStore((state) => state.updateObject);

  return (
    <section className="panel-section">
      <h2>选中对象</h2>
      <p className="object-title">文本对象</p>
      <label className="field">
        <span>文本内容</span>
        <textarea value={object.text} rows={3} onChange={(event) => updateObject(object.id, { text: event.target.value })} />
      </label>
      <div className="field-grid">
        <NumberField label="X mm" value={object.xMm} onChange={(value) => updateObject(object.id, { xMm: value })} />
        <NumberField label="Y mm" value={object.yMm} onChange={(value) => updateObject(object.id, { yMm: value })} />
      </div>
      <div className="field-grid">
        <NumberField label="字号 mm" value={object.fontSizeMm} onChange={(value) => updateObject(object.id, { fontSizeMm: value })} />
        <NumberField label="字距 mm" value={object.letterSpacingMm} onChange={(value) => updateObject(object.id, { letterSpacingMm: value })} />
      </div>
      <p className="hint">当前使用 Fake Stroke Font，只用于验证单线路径闭环。</p>
    </section>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input min={0} type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function getPatternName(kind: TestPatternObject['kind']) {
  if (kind === 'rectangle') {
    return '矩形测试图案';
  }

  if (kind === 'cross') {
    return '十字测试图案';
  }

  if (kind === 'grid') {
    return '网格测试图案';
  }

  return '线扫测试图案';
}
