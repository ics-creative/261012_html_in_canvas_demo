import * as THREE from "three/webgpu";
import * as TSL from "three/tsl";

/** 3D空間での一枚の紙幅。 */
export const sheetWidth = 4;
/** HTMLの誌面と同じ縦横比を保つ紙の高さ。 */
export const sheetHeight = (sheetWidth * 720) / 520;
const columns = 56;
const rows = 24;

/** 紙のシェーダーを一度作り、全誌面で共有する。 */
export function createPaperMaterial(grain: THREE.Texture) {
  // 裏面はUVだけを反転し、一つのジオメトリと両面マテリアルで表裏を描く。
  const front = TSL.reference("userData.front", "texture", null);
  const back = TSL.reference("userData.back", "texture", null).context({
    getUV: () => TSL.vec2(TSL.uv().x.oneMinus(), TSL.uv().y),
  });
  // texture参照の出力型を、TSLのvec4サンプル色へ変換する。
  const frontColor = TSL.nodeObject(new THREE.ConvertNode<"vec4">(front, "vec4"));
  const backColor = TSL.nodeObject(new THREE.ConvertNode<"vec4">(back, "vec4"));
  const print = TSL.faceDirection.greaterThan(0).select(frontColor, backColor);
  const translucency = TSL.reference("userData.translucency", "float", null);
  const material = new THREE.MeshSSSNodeMaterial({
    // HTMLの印刷色に繊維と漉きむらを乗算し、濃淡のある紙面をつくる。
    colorNode: print.mul(TSL.texture(grain).r.mul(0.24).add(0.76)),
    // 乾いた紙の拡散を保ち、繊維の凹凸を強めて斜光の陰影をつける。
    bumpMap: grain,
    bumpScale: 0.16,
    // 紙の拡散光を主体にし、印刷の黒のコントラストを保つ。
    sheen: 0.08,
    sheenColor: 0xf2e8d4,
    sheenRoughness: 0.8,
    specularIntensity: 0.08,
    side: THREE.DoubleSide,
  });
  // SSS固有のノードは生成後に設定し、透過光へ印刷色を反映する。
  material.setValues({
    thicknessColorNode: TSL.diffuseColor.rgb.mul(TSL.color(0xffead2)).mul(translucency),
    thicknessDistortionNode: TSL.float(0.2),
    thicknessAttenuationNode: TSL.float(0.2),
    thicknessScaleNode: TSL.float(2),
  });
  return material;
}

/** 表裏にHTMLを貼り、背から曲がる紙のメッシュ。 */
export function createPageSheet(material: THREE.MeshSSSNodeMaterial, page: THREE.Texture) {
  const geometry = new THREE.PlaneGeometry(sheetWidth, sheetHeight, columns, rows);
  const mesh = new THREE.Mesh(geometry, material);
  // 描画中の紙から誌面と透過量を参照し、同じマテリアルを共有する。
  const print = { front: page, back: page, translucency: 0 };
  mesh.userData = print;
  const edgeGeometry = new THREE.BufferGeometry();
  const edgeMaterial = new THREE.LineBasicMaterial({ color: 0xd9d2c1 });
  const edge = new THREE.Line(edgeGeometry, edgeMaterial);
  const edgeIndices: number[] = [];

  const positions = geometry.getAttribute("position") as THREE.BufferAttribute;
  positions.setUsage(THREE.DynamicDrawUsage);
  for (let column = 0; column <= columns; column += 1) edgeIndices.push(column);
  for (let row = 1; row <= rows; row += 1) edgeIndices.push(row * (columns + 1) + columns);
  for (let column = columns - 1; column >= 0; column -= 1) {
    edgeIndices.push(rows * (columns + 1) + column);
  }
  for (let row = rows - 1; row > 0; row -= 1) edgeIndices.push(row * (columns + 1));
  edgeIndices.push(0);
  // 紙面と輪郭で同じ頂点バッファを共有し、湾曲へ追従させる。
  edgeGeometry.setAttribute("position", positions);
  edgeGeometry.setIndex(edgeIndices);
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.add(edge);

  /** 一枚の紙の表と裏に誌面を割り当てる。 */
  function setTextures(front: THREE.Texture, back = front) {
    print.front = front;
    print.back = back;
  }

  /** 背からの弧長を維持しながら、めくり角度と角のねじれを反映する。 */
  function pose(progress: number, height: number, corner = 0) {
    const bend = Math.sin(progress * Math.PI);
    print.translucency = bend * 0.6;
    const step = sheetWidth / columns;
    for (let row = 0; row <= rows; row += 1) {
      const v = row / rows;
      const curl = (1 - bend) * (1 - progress * 2) * 0.32 * (1 + 0.2 * Math.sin(v * Math.PI));
      const twist = bend * corner * (v * 2 - 1) * 0.4;
      let x = 0;
      let y = height;
      for (let column = 0; column <= columns; column += 1) {
        if (column > 0) {
          const u = (column - 0.5) / columns;
          // 背側を序盤から立ち上げ、下の湾曲に沿って紙をめくる。
          const angle =
            Math.PI * progress -
            (bend * 0.4 - curl) * Math.cos(Math.PI * u) +
            twist * Math.sin(u * Math.PI * 0.5);
          x += Math.cos(angle) * step;
          y += Math.sin(angle) * step;
        }
        const u = column / columns;
        // 背を固定したまま角を少し浮かせ、紙の面に陰影の変化をつける。
        const lift = (1 - bend) * u ** 4 * (v * 2 - 1) ** 2 * 0.08;
        const ripple = Math.sin(u * Math.PI) * Math.sin(v * Math.PI * 2) * 0.04;
        positions.setXYZ(
          row * (columns + 1) + column,
          x,
          y + lift + ripple,
          (v - 0.5) * sheetHeight,
        );
      }
    }
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    edgeGeometry.boundingSphere = geometry.boundingSphere;
  }

  /** 紙の形状と輪郭を解放する。紙のマテリアルは全誌面の所有者が解放する。 */
  function dispose() {
    for (const resource of [geometry, edgeGeometry, edgeMaterial]) {
      resource.dispose();
    }
  }

  return { mesh, setTextures, pose, dispose };
}
