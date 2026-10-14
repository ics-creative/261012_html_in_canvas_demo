import * as THREE from "three/webgpu";
import * as TSL from "three/tsl";
import { createEnvironment } from "../canvas/environment";
import { ao } from "three/addons/tsl/display/GTAONode.js";
import { denoise } from "three/addons/tsl/display/DenoiseNode.js";

/** 読み込んだ本・天板・照明へ、紙の陰影処理を組み合わせる。 */
export function createBookWorld(renderer: THREE.Renderer, scene: THREE.Scene) {
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  const book = scene.getObjectByName("book")!;
  const stacks = ["stack-left", "stack-right"].map((name) => scene.getObjectByName(name)!);
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  // 室内の面光源を環境マップに焼き込み、紙と布の粗さに応じた拡散光を得る。
  scene.environment = createEnvironment(renderer, 256).texture;

  // 深度と法線から紙の重なり・背・接地面を遮蔽し、間接光だけに反映する。
  // GTAOへ渡す深度を単一サンプルで取得する。
  const normals = TSL.pass(scene, camera, { samples: 0 }).setResolutionScale(0.5);
  // 法線の前処理は、専用の軽い素材を共有する。
  normals.overrideMaterial = new THREE.MeshBasicNodeMaterial({ side: THREE.DoubleSide });
  normals.setMRT(TSL.mrt({ output: TSL.normalView }));
  // 法線パスのAOを白に固定し、色の描画とは別に深度と法線を取得する。
  normals.contextNode = TSL.builtinAOContext(TSL.float(1));
  const normal = normals.getTextureNode();
  const depth = normals.getTextureNode("depth");
  const occlusion = ao(depth, normal, camera);
  occlusion.resolutionScale = 0.5;
  occlusion.radius.value = 0.4;
  occlusion.thickness.value = 0.2;
  occlusion.samples.value = 24;
  const filtered = denoise(occlusion.getTextureNode(), depth, normal, camera);
  filtered.radius.value = 8;
  // 平滑化したAOを独立した画像へ描き、画面座標から参照する。
  const filteredTexture = TSL.convertToTexture(filtered);
  // AOの前処理を最終描画へ接続し、紙の重なりと接地の陰影をつける。
  renderer.contextNode = TSL.builtinAOContext(filteredTexture.sample(TSL.screenUV).r);

  return {
    camera,
    book,
    stacks,
  };
}
