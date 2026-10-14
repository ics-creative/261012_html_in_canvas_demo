import * as THREE from "three/webgpu";
import { createEnvironment } from "../../../shared/rendering/environment";
import { applyOcclusion } from "../../../shared/rendering/occlusion";

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

  applyOcclusion(renderer, scene, camera);

  return {
    camera,
    book,
    stacks,
  };
}
