import * as THREE from "three/webgpu";
import {
  builtinAOContext,
  float,
  materialRoughness,
  mx_noise_float,
  output,
  positionLocal,
} from "three/tsl";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { ParametricGeometry } from "three/addons/geometries/ParametricGeometry.js";
import { toCreasedNormals } from "three/addons/utils/BufferGeometryUtils.js";

/** 後傾した前面と丸い下腹を持つ、無彩色のiMac G3風CRT筐体を作る。 */
export function createRetroComputer(screenTexture: THREE.Texture) {
  const computer = new THREE.Group();
  const front = new THREE.Group();
  front.position.set(0, 2.6, 1.4);
  // 前面全体を後傾させ、入力の投影座標も画面とベゼルの傾きへ合わせる。
  front.rotation.x = -Math.PI / 16;
  computer.add(front);
  const geometries = new Set<THREE.BufferGeometry>();
  const shell = new THREE.MeshPhysicalNodeMaterial({
    color: 0xd8d8d8,
    roughness: 0.32,
    clearcoat: 0.48,
    clearcoatRoughness: 0.16,
  });
  // 成形樹脂の微細な粗さだけを変え、反射を均一な鏡面にしない。
  // 粗さの基準値を素材から読み、前面と背面で同じシェーダーを共有する。
  shell.roughnessNode = materialRoughness.add(mx_noise_float(positionLocal.mul(128)).mul(0.04));
  shell.outputNode = output.toneMapping(THREE.AgXToneMapping);
  const back = shell.clone();
  back.color.setHex(0xb0b0b0);
  back.roughness = 0.24;
  const recess = new THREE.MeshStandardNodeMaterial({ color: 0x181818, roughness: 0.64 });
  recess.outputNode = output.toneMapping(THREE.AgXToneMapping);
  const screenMaterial = new THREE.MeshBasicNodeMaterial({ map: screenTexture });
  // 発光する画面は、筐体のトーンマッピングや間接光の遮蔽を受けない。
  screenMaterial.contextNode = builtinAOContext(float(1));

  function part(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    position: THREE.Vector3Tuple,
    parent = front,
  ) {
    geometries.add(geometry);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.fromArray(position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  const outline = roundedRectangle(4.8, 4.8, 0.6);
  // 背面へ向かって断面を楕円へ丸める。下腹を残し、箱型や対称の半球にしない。
  part(
    new ParametricGeometry(
      (u, v, position) => {
        const curve = v * Math.PI * 0.5;
        const depth = Math.sin(curve);
        const point = outline.getPointAt(1 - u);
        const round = 1 + (1 / Math.hypot(point.x / 2.4, point.y / 2.4) - 1) * depth;
        const radius = Math.cos(curve) * round;
        position.set(point.x * radius, point.y * radius + 0.32 * depth, -4.8 * depth);
      },
      96,
      48,
    ),
    back,
    [0, 0, 0],
  );
  // 厚い下部にCDスロットと左右の丸いスピーカーを収める。
  // 開口部を画面より広くし、ベゼルの厚みでメニューバーを覆わない。
  outline.holes.push(roundedRectangle(3.76, 2.88, 0.12, 0.4));
  part(
    toCreasedNormals(
      new THREE.ExtrudeGeometry(outline, {
        depth: 0.16,
        bevelSize: 0.08,
        bevelThickness: 0.08,
        bevelSegments: 8,
        curveSegments: 24,
      }),
      Math.PI / 12,
    ),
    shell,
    [0, 0, -0.04],
  );
  part(new RoundedBoxGeometry(3.8, 2.92, 0.12, 4, 0.06), recess, [0, 0.4, 0.08]);
  for (const side of [-1, 1]) {
    // スピーカーにも浅い曲面を持たせ、平坦な黒丸にしない。
    const speaker = part(new THREE.SphereGeometry(0.28, 32, 16), recess, [side * 1.72, -1.4, 0.24]);
    speaker.scale.z = 0.16;
  }
  part(new RoundedBoxGeometry(1.2, 0.04, 0.04, 4, 0.02), recess, [0, -1.4, 0.24]);
  const grip = part(new RoundedBoxGeometry(0.96, 0.08, 0.24, 4, 0.04), recess, [0, 2.1, -2.8]);
  grip.rotation.x = -Math.PI / 12;
  // 筐体の下に低い脚だけを置き、独立した大きな台座をなくす。
  part(new RoundedBoxGeometry(2.4, 0.16, 1.2, 4, 0.08), shell, [0, 0.08, 0.8], computer);

  const screenGeometry = new THREE.PlaneGeometry(3.52, 2.64, 48, 36);
  const positions = screenGeometry.getAttribute("position");
  // CRTらしさはガラスの曲率に留め、HTMLの表示へノイズやグリッチを重ねない。
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index) / 1.76;
    const y = positions.getY(index) / 1.32;
    positions.setZ(index, 0.06 * (1 - x * x) * (1 - y * y));
  }
  screenGeometry.computeVertexNormals();
  const screen = part(screenGeometry, screenMaterial, [0, 0.4, 0.16]);
  screen.castShadow = screen.receiveShadow = false;

  return {
    computer,
    screen,
    dispose() {
      // 渡された画面テクスチャは所有者に任せ、筐体の共有素材を一度だけ解放する。
      for (const geometry of geometries) geometry.dispose();
      for (const material of [shell, back, recess, screenMaterial]) material.dispose();
    },
  };
}

function roundedRectangle(width: number, height: number, radius: number, centerY = 0) {
  const shape = new THREE.Shape();
  const x = width / 2;
  const top = centerY + height / 2;
  const bottom = centerY - height / 2;
  shape.moveTo(-x + radius, bottom);
  shape.lineTo(x - radius, bottom);
  shape.quadraticCurveTo(x, bottom, x, bottom + radius);
  shape.lineTo(x, top - radius);
  shape.quadraticCurveTo(x, top, x - radius, top);
  shape.lineTo(-x + radius, top);
  shape.quadraticCurveTo(-x, top, -x, top - radius);
  shape.lineTo(-x, bottom + radius);
  shape.quadraticCurveTo(-x, bottom, -x + radius, bottom);
  return shape;
}
