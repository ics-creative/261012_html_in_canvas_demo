import { Line, Point, Polygon, Segment } from "@flatten-js/core";

/** HTML原寸上の頂点。切断後のUVはこの座標から一意に復元する。 */
export type Vertex = { x: number; y: number };

/** 凸多角形を直線で分割し、元HTMLの座標のまま交点を求める。 */
export function splitPolygon(vertices: Vertex[], start: Vertex, end: Vertex) {
  const polygon = new Polygon(vertices.map(({ x, y }) => new Point(x, y)));
  const beam = new Segment(new Point(start.x, start.y), new Point(end.x, end.y));
  // ビームが両端まで通った断片だけを、標準の多角形演算で分割する。
  if (polygon.intersect(beam).length !== 2) return null;
  const faces = [...polygon.cutWithLine(new Line(beam.start, beam.end)).faces];
  if (faces.length !== 2 || faces.some((face) => face.area() < 24)) return null;
  const halves: Vertex[][] = faces.map((face) => face.vertices);
  // 左法線側を先にし、分断した二枚の反発方向を揃える。
  const left = halves[0].some(
    ({ x, y }) => (start.y - end.y) * (x - start.x) + (end.x - start.x) * (y - start.y) > 0.001,
  );
  if (!left) halves.reverse();
  return halves;
}
