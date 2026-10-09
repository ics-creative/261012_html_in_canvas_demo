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
  const environment = createEnvironment(renderer, 256);
  scene.environment = environment.texture;

  // 深度と法線から紙の重なり・背・接地面を遮蔽し、間接光だけに反映する。
  // GTAOは深度を直接参照するため、この前処理にはMSAAを使わない。
  const normals = TSL.pass(scene, camera, { samples: 0 }).setResolutionScale(0.5);
  // 法線の前処理では照明・SSS・影を計算せず、専用の軽い素材を共有する。
  const normalMaterial = new THREE.MeshBasicNodeMaterial({ side: THREE.DoubleSide });
  normals.overrideMaterial = normalMaterial;
  normals.setMRT(TSL.mrt({ output: TSL.normalView }));
  // 色の描画からAOを継承させず、法線パスが自身の深度・出力を読む循環を防ぐ。
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
  // 平滑化は独立した画面で済ませ、紙のUVではなく画面座標から参照する。
  const filteredTexture = TSL.convertToTexture(filtered);
  const color = TSL.pass(scene, camera);
  color.contextNode = TSL.builtinAOContext(filteredTexture.sample(TSL.screenUV).r);
  const pipeline = new THREE.RenderPipeline(renderer, color);
  const resources = [
    environment,
    normalMaterial,
    normals,
    occlusion,
    filtered,
    filteredTexture,
    color,
    pipeline,
  ];

  return {
    camera,
    book,
    stacks,
    render: () => pipeline.render(),
    dispose() {
      for (const resource of resources) resource.dispose();
    },
  };
}
