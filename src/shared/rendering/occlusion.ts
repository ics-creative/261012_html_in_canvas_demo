import * as THREE from "three/webgpu";
import * as TSL from "three/tsl";
import { ao } from "three/addons/tsl/display/GTAONode.js";
import { denoise } from "three/addons/tsl/display/DenoiseNode.js";

/** 深度と法線から、接地面・紙の重なり・筐体の継ぎ目の陰影を描く。 */
export function applyOcclusion(
  renderer: THREE.Renderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  samples = 24,
  side: THREE.Side = THREE.DoubleSide,
) {
  // GTAOの法線を半解像度・単一サンプルの軽い専用材質で描く。
  const normals = TSL.pass(scene, camera, { samples: 0 }).setResolutionScale(0.5);
  normals.overrideMaterial = new THREE.MeshBasicNodeMaterial({ side });
  normals.setMRT(TSL.mrt({ output: TSL.normalView }));
  // 前処理の遮蔽を白に固定し、最終描画の間接光へ結果を反映する。
  normals.contextNode = TSL.builtinAOContext(TSL.float(1));
  const normal = normals.getTextureNode();
  const depth = normals.getTextureNode("depth");
  const occlusion = ao(depth, normal, camera);
  occlusion.resolutionScale = 0.5;
  occlusion.radius.value = 0.4;
  occlusion.thickness.value = 0.2;
  occlusion.samples.value = samples;
  // 空間方向に平滑化し、柔らかな接地の濃さを独立した画像から参照する。
  const filtered = denoise(occlusion.getTextureNode(), depth, normal, camera);
  filtered.radius.value = 8;
  renderer.contextNode = TSL.builtinAOContext(
    TSL.convertToTexture(filtered).sample(TSL.screenUV).r,
  );
}
