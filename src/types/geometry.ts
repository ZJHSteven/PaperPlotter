/**
 * 几何基础类型。
 *
 * 本项目有图片坐标、纸张坐标、机器坐标三套坐标系。
 * 第一阶段先建立可复用类型，后续标定、路径变换和 G-code 导出都复用这些定义。
 */

export type PointMm = {
  /** X 坐标，纸面/机器空间中统一使用毫米。 */
  x: number;
  /** Y 坐标，纸面约定向下为正，机器空间会在导出前按配置转换。 */
  y: number;
};

export type ImagePoint = {
  /** 照片原始像素坐标中的 X。 */
  x: number;
  /** 照片原始像素坐标中的 Y。 */
  y: number;
};

export type PaperPoint = PointMm;

export type MachinePoint = PointMm;

export type Vector2 = {
  x: number;
  y: number;
};

export type PolylinePath = {
  /** 折线点列。少于 2 个点时不能生成有效绘制路径。 */
  points: PointMm[];
  /** true 表示导出时需要回到起点闭合图形。 */
  closed?: boolean;
};

export type Matrix2D = {
  /**
   * 2D 仿射矩阵，按 SVG/Canvas 常见顺序保存：
   * x' = a*x + c*y + e
   * y' = b*x + d*y + f
   */
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
};

export type HomographyMatrix = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];
