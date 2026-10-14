import * as THREE from "three/webgpu";
import {
  float,
  negateOnBackSide,
  texture,
  textureBicubicLevel,
  transformNormalToView,
  uv,
  vec2,
} from "three/tsl";

/** 物理格子の位置と法線を、Threeの標準bicubic補間でGPUへ渡す。 */
export function createClothGeometry(
  cloth: THREE.Mesh<
    THREE.PlaneGeometry,
    THREE.MeshStandardMaterial | THREE.MeshStandardNodeMaterial
  >,
  picking: THREE.PlaneGeometry,
) {
  // 物理格子を縦横4分割した192×120の描画格子を、GPUで滑らかにつなぐ。
  const { widthSegments: columns, heightSegments: rows } = picking.parameters;
  const width = columns + 1;
  const height = rows + 1;
  const fields = ["position", "normal"] as const;
  // 格子をClampToEdgeWrappingで延長し、両端の補間も画像の境界へ収める。
  const buffers = fields.map(() => new Float32Array(width * height * 4));
  const textures = buffers.map((data) => {
    const image = new THREE.DataTexture(data, width, height);
    image.type = THREE.FloatType;
    image.minFilter = image.magFilter = THREE.LinearFilter;
    return image;
  });
  // 両端の補間範囲をtexelの中心へ収め、床付近まで滑らかな曲面をつなぐ。
  // 各描画頂点の補間先を、格子のUVから一度だけ計算する。
  const samples = vec2(uv().x, uv().y.oneMinus())
    .mul(vec2(columns, rows))
    .add(0.5)
    .div(vec2(width, height));
  const material = new THREE.MeshStandardNodeMaterial().copy(cloth.material);
  material.positionNode = textureBicubicLevel(texture(textures[0], samples), float(0)).xyz;
  material.normalNode = negateOnBackSide(
    transformNormalToView(textureBicubicLevel(texture(textures[1], samples), float(0)).xyz),
  ).normalize();
  cloth.material = material;
  // 描画用とヒット判定用の格子は同じ物理位置を参照する。
  cloth.geometry.boundingSphere = picking.boundingSphere = new THREE.Sphere(
    new THREE.Vector3(),
    1500,
  );

  /** 物理格子から、描画用の位置・法線とヒット判定用の格子を更新する。 */
  function update(positions: Float32Array) {
    picking.getAttribute("position").array.set(positions);
    picking.computeVertexNormals();
    // 横方向の位置・法線をそれぞれ3成分ずつまとめ、同じ画像を影パスでも共有する。
    fields.forEach((name, index) => {
      const source = picking.getAttribute(name).array;
      const image = textures[index];
      for (let vertex = 0; vertex < source.length / 3; vertex++)
        for (let axis = 0; axis < 3; axis++)
          buffers[index][vertex * 4 + axis] = source[vertex * 3 + axis];
      image.needsUpdate = true;
      // needsUpdateで更新をまとめ、同じ画像を描画と影パスで共有する。
    });
  }

  return update;
}
