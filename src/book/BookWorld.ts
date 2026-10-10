import * as THREE from "three/webgpu";
import * as TSL from "three/tsl";
import { createEnvironment } from "../canvas/environment";
import { ao } from "three/addons/tsl/display/GTAONode.js";
import { denoise } from "three/addons/tsl/display/DenoiseNode.js";
import { own } from "../canvas/lifecycle";

/** 読み込んだ本・天板・照明へ、紙の陰影処理を組み合わせる。 */
export function createBookWorld(renderer: THREE.Renderer, scene: THREE.Scene, signal: AbortSignal) {
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  const book = scene.getObjectByName("book")!;
  const stacks = ["stack-left", "stack-right"].map((name) => scene.getObjectByName(name)!);
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  // 室内の面光源を環境マップに焼き込み、紙と布の粗さに応じた拡散光を得る。
  scene.environment = own(signal, createEnvironment(renderer, 256)).texture;

  // 深度と法線から紙の重なり・背・接地面を遮蔽し、間接光だけに反映する。
  // GTAOは深度を直接参照するため、この前処理にはMSAAを使わない。
  const normals = own(signal, TSL.pass(scene, camera, { samples: 0 }).setResolutionScale(0.5));
  // 法線の前処理では照明・SSS・影を計算せず、専用の軽い素材を共有する。
  normals.overrideMaterial = own(
    signal,
    new THREE.MeshBasicNodeMaterial({ side: THREE.DoubleSide }),
  );
  normals.setMRT(TSL.mrt({ output: TSL.normalView }));
  // 色の描画からAOを継承させず、法線パスが自身の深度・出力を読む循環を防ぐ。
  normals.contextNode = TSL.builtinAOContext(TSL.float(1));
  const normal = normals.getTextureNode();
  const depth = normals.getTextureNode("depth");
  const occlusion = own(signal, ao(depth, normal, camera));
  occlusion.resolutionScale = 0.5;
  occlusion.radius.value = 0.4;
  occlusion.thickness.value = 0.2;
  occlusion.samples.value = 24;
  const filtered = own(signal, denoise(occlusion.getTextureNode(), depth, normal, camera));
  filtered.radius.value = 8;
  // 平滑化は独立した画面で済ませ、紙のUVではなく画面座標から参照する。
  const filteredTexture = own(signal, TSL.convertToTexture(filtered));
  // AOの前処理だけを追加し、最終描画と解放は共通のRendererとsignalへ任せる。
  renderer.contextNode = TSL.builtinAOContext(filteredTexture.sample(TSL.screenUV).r);

  return {
    camera,
    book,
    stacks,
    render: () => renderer.render(scene, camera),
  };
}
