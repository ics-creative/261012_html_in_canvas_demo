import * as THREE from "three/webgpu";
import { reflector, vec3 } from "three/tsl";
import gsap from "gsap";
import { createEnvironment } from "./environment";
import { createClothSimulation } from "./cloth/ClothSimulation";
import { createClothGeometry } from "./cloth/ClothGeometry";
import { createClothControls } from "./cloth/ClothControls";
import { createCanvasTextures } from "./textures";
import { createRenderer } from "./renderer";
import { fitOrbit } from "./orbit";
import { onCleanup, own } from "./lifecycle";
import { loadSceneAsset } from "./sceneAsset";

/** 平らなHTMLを正面から見せ、無風の導入後に布の物理と風を動かす。 */
export async function createSurfaceEngine(
  host: HTMLElement,
  canvas: HTMLCanvasElement,
  signal: AbortSignal,
) {
  // 48×30の物理格子と192×120の描画格子を分け、毎フレームの計算量を抑える。
  // 画面の離脱で購読・ループを止めてから、GPUリソースをまとめて解放する。
  const [renderer, scene] = await Promise.all([
    createRenderer(host, signal),
    loadSceneAsset("/scenes/cloth.json", signal),
  ]);
  signal.throwIfAborted();
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = true;

  const camera = scene.getObjectByName("Camera") as THREE.PerspectiveCamera;
  const environment = own(signal, createEnvironment(renderer, 512));
  scene.environment = environment.texture;

  const floor = scene.getObjectByName("Floor");
  if (!(floor instanceof THREE.Mesh) || !(floor.material instanceof THREE.MeshStandardMaterial))
    throw new Error("布の床がありません。");
  // 床を基準に反射カメラを作り、揺れる布と視点の変化を同じフレームへ映す。
  // 半解像度で描画量を抑え、床の照明・影を残したまま鮮明な鏡像を重ねる。
  const reflection = own(signal, reflector({ resolutionScale: 0.5, samples: 4 }));
  const floorMaterial = own(signal, new THREE.MeshStandardNodeMaterial().copy(floor.material));
  floorMaterial.roughness = 0.08;
  floorMaterial.metalness = 0.8;
  // 環境画像の白い照明を重ねず、実際の布の鏡像を見せる。
  floorMaterial.envNode = vec3(0);
  floorMaterial.emissiveNode = reflection.mul(0.8);
  floor.material = floorMaterial;
  floor.add(reflection.target);

  // 連続描画はanimation loopに任せ、HTMLのpaint中はテクスチャの更新だけを行う。
  const { textures, painted } = createCanvasTextures([canvas], renderer, signal);
  // 読み込み済みの布・照明・床へ、HTMLと布の物理を接続する。
  const cloth = scene.getObjectByName("Cloth") as THREE.Mesh<
    THREE.PlaneGeometry,
    THREE.MeshStandardMaterial
  >;
  const picking = scene.getObjectByName("Picking") as THREE.Mesh<THREE.PlaneGeometry>;
  cloth.material.map = textures[0];
  // 床の遠景用フォグを布へ掛けず、縦長画面やズームアウトでも誌面を消さない。
  cloth.material.fog = false;
  const initialPose = new Float32Array(picking.geometry.getAttribute("position").array);
  const physics = createClothSimulation(initialPose, signal);
  const updateGeometry = createClothGeometry(cloth.geometry, picking.geometry);
  updateGeometry(physics.interpolatedPositions);
  // 布・床・影はシーン素材側で解放し、HTMLテクスチャは画面で所有する。
  const orbit = createClothControls(camera, renderer.domElement, { physics, picking }, signal);
  let lastFrame = 0;
  const wind = { strength: 0 };
  // 風で膨らむ布と床の映り込みに余白を取り、リサイズでも方向とズーム比率を保つ。
  fitOrbit(renderer, host, camera, orbit, signal, {
    width: 760 * 1.4,
    height: 480 * 1.6,
    zoom: [1, 1.6],
    position: (distance) => camera.position.set(0, 0, distance),
  });
  // 表示交換のスナップショットに、空のHTMLテクスチャを渡さない。
  await painted;
  signal.throwIfAborted();
  renderer.render(scene, camera);
  // 2秒は重力も進めず平面を保ち、その後に風圧を滑らかに立ち上げる。
  const intro = gsap.timeline().to(wind, { strength: 1, duration: 2, ease: "sine.inOut" }, 2);
  // 待機中に掴んだときは、その場で物理を始めて入力へ応答する。
  host.addEventListener(
    "pointerdown",
    () => {
      if (!wind.strength) intro.play(2);
    },
    { once: true, signal },
  );
  onCleanup(signal, () => intro.kill());
  renderer.setAnimationLoop((now) => {
    const delta = lastFrame ? (now - lastFrame) / 1000 : 0;
    lastFrame = now;
    orbit.update();
    // 新しい姿勢だけGPUへ送り、未更新の格子を繰り返し計算・転送しない。
    if (wind.strength && physics.update(delta, wind.strength)) {
      updateGeometry(physics.interpolatedPositions);
    }
    renderer.render(scene, camera);
  });
}
