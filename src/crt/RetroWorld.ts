import * as THREE from "three/webgpu";
import * as TSL from "three/tsl";
import { RectAreaLightTexturesLib } from "three/addons/lights/RectAreaLightTexturesLib.js";
import { ao } from "three/addons/tsl/display/GTAONode.js";
import { denoise } from "three/addons/tsl/display/DenoiseNode.js";
import { createEnvironment } from "../canvas/environment";
import { own } from "../canvas/lifecycle";
import { materialRoughness, mx_noise_float, positionLocal } from "three/tsl";

// 面光源のBRDF表を、WebGPUのライティングノードへ一度だけ登録する。
THREE.RectAreaLightNode.setLTC(RectAreaLightTexturesLib.init());

/** 面光源の反射と間接光の遮蔽で、樹脂の曲面・継ぎ目・接地面を描く。 */
export function createRetroWorld(
  renderer: THREE.Renderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  signal: AbortSignal,
) {
  // フォグを通した床の暗さへ背景を合わせ、平面の終端を見せない。
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  scene.environment = own(signal, createEnvironment(renderer, 256)).texture;
  // 後傾した前面と丸い下腹を持つ、無彩色のiMac G3風CRT筐体を素材から読む。
  // 前面全体を後傾させ、入力の投影座標も画面とベゼルの傾きへ合わせる。
  // 背面へ向かって断面を楕円へ丸める。下腹を残し、箱型や対称の半球にしない。
  // 厚い下部にCDスロットと左右の丸いスピーカーを収める。
  // 開口部を画面より広くし、ベゼルの厚みでメニューバーを覆わない。
  // スピーカーにも浅い曲面を持たせ、平坦な黒丸にしない。
  // 筐体の下に低い脚だけを置き、独立した大きな台座をなくす。
  // 渡された画面テクスチャは所有者に任せ、筐体の共有素材を一度だけ解放する。
  const materials = new Map<THREE.Material, THREE.NodeMaterial>();
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || !(object.material instanceof THREE.Material)) return;
    let material = materials.get(object.material);
    if (!material) {
      // 素材の数値を標準NodeLibraryで引き継ぎ、共有材質も一度だけ変換する。
      material = own(signal, renderer.library.fromMaterial(object.material));
      materials.set(object.material, material);
      if (material instanceof THREE.MeshBasicNodeMaterial) {
        // 発光する画面は、筐体のトーンマッピングや間接光の遮蔽を受けない。
        material.contextNode = TSL.builtinAOContext(TSL.float(1));
      } else material.outputNode = TSL.output.toneMapping(THREE.AgXToneMapping);
      if (material instanceof THREE.MeshPhysicalNodeMaterial) {
        // 成形樹脂の微細な粗さだけを変え、反射を均一な鏡面にしない。
        // 粗さの基準値を素材から読み、前面と背面で同じシェーダーを共有する。
        material.roughnessNode = materialRoughness.add(
          mx_noise_float(positionLocal.mul(128)).mul(0.04),
        );
      }
    }
    object.material = material;
  });
  // 主光を上方へ寄せ、反対側は面光源の細い反射で輪郭だけを拾う。
  const key = scene.getObjectByName("Key");
  if (!(key instanceof THREE.DirectionalLight)) throw new Error("CRTの照明がありません。");
  // 筐体は静止しているため、柔らかい影を初回だけ計算する。
  key.shadow.autoUpdate = false;
  key.shadow.needsUpdate = true;

  // 半解像度のGTAOを平滑化し、直射光やHTML画面を暗くせず間接光だけへ適用する。
  const normals = own(signal, TSL.pass(scene, camera, { samples: 0 }).setResolutionScale(0.5));
  // 法線だけが必要な前処理で、面光源・樹脂の反射・影を重ねて計算しない。
  normals.overrideMaterial = own(signal, new THREE.MeshBasicNodeMaterial());
  normals.setMRT(TSL.mrt({ output: TSL.normalView }));
  normals.contextNode = TSL.builtinAOContext(TSL.float(1));
  const normal = normals.getTextureNode();
  const depth = normals.getTextureNode("depth");
  const occlusion = own(signal, ao(depth, normal, camera));
  occlusion.resolutionScale = 0.5;
  occlusion.radius.value = 0.4;
  occlusion.thickness.value = 0.2;
  occlusion.samples.value = 12;
  const filtered = own(signal, denoise(occlusion.getTextureNode(), depth, normal, camera));
  filtered.radius.value = 8;
  const indirect = own(signal, TSL.convertToTexture(filtered));
  // 陰影の中間画像だけを参照し、最終描画は通常のRendererへ渡す。
  renderer.contextNode = TSL.builtinAOContext(indirect.sample(TSL.screenUV).r);
  return { scene, render: () => renderer.render(scene, camera) };
}
