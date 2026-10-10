import * as THREE from "three";

// 物理格子を縦横4分割し、計算量を抑えても描画の192×120分割を保つ。
const SUBDIVISIONS = 4;

// 各描画頂点の補間先を、格子の位置から一度だけ計算する。
function createSampler(segments: number, stride: number, target: Float32Array) {
  const values = new Float32Array((segments + 3) * stride);
  const samples = new THREE.CubicInterpolant(
    Float32Array.from({ length: segments + 3 }, (_, index) => index),
    values,
    stride,
  );
  const targets = Array.from({ length: segments * SUBDIVISIONS + 1 }, (_, index) =>
    target.subarray(index * stride, (index + 1) * stride),
  );
  return (source: Float32Array, bounded: boolean) => {
    // 両端の値を複製し、端の4点も従来のCatmull–Romと同じ条件で補間する。
    values.set(source, stride);
    values.set(source.subarray(0, stride));
    values.set(source.subarray(source.length - stride), values.length - stride);
    for (let index = 0; index <= segments * SUBDIVISIONS; index++) {
      const point = 1 + index / SUBDIVISIONS;
      samples.resultBuffer = targets[index];
      const value = samples.evaluate(point);
      const start = Math.floor(point) * stride;
      // 端の補間範囲を制限し、床付近まで滑らかな曲面をつなぐ。
      if (bounded)
        for (let axis = 0; axis < stride; axis++) {
          const a = values[start + axis];
          const b = values[start + stride + axis];
          value[axis] = THREE.MathUtils.clamp(value[axis], Math.min(a, b), Math.max(a, b));
        }
    }
  };
}

/** 物理格子を縦横4分割し、位置と法線をCatmull–Romで滑らかに補間する。 */
export function createClothGeometry(geometry: THREE.PlaneGeometry, picking: THREE.PlaneGeometry) {
  const { widthSegments: columns, heightSegments: rows } = picking.parameters;
  // 描画用とヒット判定用のジオメトリの解放は、素材を読み込んだシーンへ任せる。
  const width = columns * SUBDIVISIONS + 1;
  const horizontal = new Float32Array(width * (rows + 1) * 3);
  const sampleX = Array.from({ length: rows + 1 }, (_, row) =>
    createSampler(columns, 3, horizontal.subarray(row * width * 3, (row + 1) * width * 3)),
  );
  const sampleY = ["position", "normal"].map((name) =>
    createSampler(rows, width * 3, geometry.getAttribute(name).array as Float32Array),
  );
  geometry.boundingSphere = picking.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1500);
  // needsUpdateで更新をまとめ、同じ頂点バッファを描画と影パスで共有する。

  /** 物理格子から、描画用の位置・法線とヒット判定用の格子を更新する。 */
  function update(positions: Float32Array) {
    picking.getAttribute("position").array.set(positions);
    picking.computeVertexNormals();
    // 横方向の位置・法線をそれぞれ3成分ずつまとめて補間する。
    for (const [index, name] of ["position", "normal"].entries()) {
      const source = picking.getAttribute(name).array as Float32Array;
      const target = geometry.getAttribute(name);
      for (let row = 0; row <= rows; row++) {
        sampleX[row](
          source.subarray(row * (columns + 1) * 3, (row + 1) * (columns + 1) * 3),
          name === "position",
        );
      }
      sampleY[index](horizontal, name === "position");
      target.needsUpdate = true;
    }
  }

  return update;
}
