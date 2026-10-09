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
  camera: THREE.PerspectiveCamera,
  signal: AbortSignal,
) {
  const scene = new THREE.Scene();
  // フォグを通した床の暗さへ背景を合わせ、平面の終端を見せない。
  scene.background = new THREE.Color(0x080808);
  scene.fog = new THREE.Fog(0x141414, 16, 40);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  scene.environment = own(signal, createEnvironment(renderer, 256)).texture;
  scene.environmentIntensity = 0.24;
  const floor = new THREE.Mesh(
    own(signal, new THREE.PlaneGeometry(80, 80)),
    own(
      signal,
      new THREE.MeshStandardNodeMaterial({
        color: 0x101010,
        roughness: 0.8,
        outputNode: TSL.output.toneMapping(THREE.AgXToneMapping),
      }),
    ),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // 主光を上方へ寄せ、反対側は面光源の細い反射で輪郭だけを拾う。
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(-4, 8, 6);
  key.target.position.set(0, 2, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  // 筐体は静止しているため、柔らかい影を初回だけ計算する。
  key.shadow.autoUpdate = false;
  key.shadow.needsUpdate = true;
  Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 0.2, far: 24 });
  key.shadow.radius = 12;
  key.shadow.blurSamples = 16;
  key.shadow.normalBias = 0.02;
  scene.add(key, key.target);
  own(signal, key.shadow);
  const softbox = new THREE.RectAreaLight(0xffffff, 8, 6, 4);
  softbox.position.set(-4, 6, 6);
  softbox.lookAt(0, 2, 0);
  const rim = new THREE.RectAreaLight(0xffffff, 4, 2, 6);
  rim.position.set(4, 4, -4);
  rim.lookAt(0, 2, -1.6);
  scene.add(softbox, rim);

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
