import { ShapeUtils, Vector2 } from "three";

/** HTML原寸上の頂点。切断後のUVはこの座標から一意に復元する。 */
export type Vertex = { x: number; y: number };

/** 凸多角形を直線で分割し、元HTMLの座標のまま交点を求める。 */
export function splitPolygon(vertices: Vertex[], start: Vertex, end: Vertex) {
  const direction = new Vector2().subVectors(end, start);
  const length = direction.length();
  const normal = new Vector2(-direction.y, direction.x).normalize();
  const offset = normal.dot(start);
  const positive: Vertex[] = [];
  const negative: Vertex[] = [];
  const epsilon = 0.001;
  const onSegment = (point: Vertex) => {
    const distance =
      ((point.x - start.x) * direction.x + (point.y - start.y) * direction.y) / length;
    return distance >= -epsilon && distance <= length + epsilon;
  };

  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % vertices.length];
    const da = normal.dot(a) - offset;
    const db = normal.dot(b) - offset;
    if (Math.abs(da) <= epsilon && !onSegment(a)) return null;
    if (da >= -epsilon) positive.push(a);
    if (da <= epsilon) negative.push(a);
    if ((da > epsilon && db < -epsilon) || (da < -epsilon && db > epsilon)) {
      const intersection = new Vector2().lerpVectors(a, b, da / (da - db));
      if (!onSegment(intersection)) return null;
      positive.push(intersection);
      negative.push(intersection);
    }
  }
  if (positive.length < 3 || negative.length < 3) return null;
  if (Math.abs(ShapeUtils.area(positive)) < 24 || Math.abs(ShapeUtils.area(negative)) < 24)
    return null;
  return [positive, negative] as const;
}
