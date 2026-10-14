import * as THREE from "three/webgpu";
import * as TSL from "three/tsl";
import { RectAreaLightTexturesLib } from "three/addons/lights/RectAreaLightTexturesLib.js";
import { ao } from "three/addons/tsl/display/GTAONode.js";
import { denoise } from "three/addons/tsl/display/DenoiseNode.js";
import { createEnvironment } from "../canvas/environment";
import { own } from "../canvas/lifecycle";

// 面光源のBRDF表を、WebGPUのライティングノードへ一度だけ登録する。
THREE.RectAreaLightNode.setLTC(RectAreaLightTexturesLib.init());

/** 面光源の反射と間接光の遮蔽で、樹脂の曲面・継ぎ目・接地面を描く。 */
export function createRetroWorld(
  renderer: THREE.Renderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  signal: AbortSignal,
) {
  // フォグを通した床の暗さへ背景色を合わせ、遠景をつなぐ。
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  scene.environment = own(signal, createEnvironment(renderer, 256)).texture;
  // 後傾した前面と丸い下腹を持つ、無彩色のiMac G3風CRT筐体を素材から読む。
  // 前面全体を後傾させ、入力の投影座標も画面とベゼルの傾きへ合わせる。
  // 背面へ向かって断面を楕円へ丸め、筐体の下腹にふくらみを残す。
  // 厚い下部にCDスロットと左右の丸いスピーカーを収める。
  // 開口部を画面より広くし、メニューバーまで見える余白をベゼルへ取る。
  // スピーカーにも浅い曲面を持たせ、正面から見た凹凸をつける。
  // 筐体の下へ低い脚を置き、本体を床から支える。
  // 筐体の色・反射・粗さは、モデルに保存した材質から読み込む。
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || !(object.material instanceof THREE.NodeMaterial)) return;
    const material = object.material;
    // HTML画面の配色を保ち、筐体と床の明るさを整える。
    if (material instanceof THREE.MeshBasicNodeMaterial) {
      material.contextNode = TSL.builtinAOContext(TSL.float(1));
    } else material.outputNode = TSL.output.toneMapping(THREE.AgXToneMapping);
    if (material instanceof THREE.MeshPhysicalNodeMaterial) {
      // 成形樹脂の粗さに細かな変化をつけ、表面の反射へむらを出す。
      // 保存された粗さへ表面の粒度を加え、筐体の質感を整える。
      material.roughnessNode = TSL.materialRoughness.add(
        TSL.mx_noise_float(TSL.positionLocal.mul(128)).mul(0.04),
      );
    }
  });
  // 主光を上方へ寄せ、反対側は面光源の細い反射で輪郭だけを拾う。
  const key = scene.getObjectByName("Key");
  if (!(key instanceof THREE.DirectionalLight)) throw new Error("CRTの照明がありません。");
  // 筐体は静止しているため、柔らかい影を初回だけ計算する。
  key.shadow.autoUpdate = false;
  key.shadow.needsUpdate = true;

  // 半解像度のGTAOを平滑化し、間接光の遮蔽として適用する。
  const normals = own(signal, TSL.pass(scene, camera, { samples: 0 }).setResolutionScale(0.5));
  // 法線の前処理には専用の軽い材質を使い、形状の情報を描く。
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
  return () => renderer.render(scene, camera);
}
