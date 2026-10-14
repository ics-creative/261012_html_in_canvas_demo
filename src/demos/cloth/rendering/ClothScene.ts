import * as THREE from "three/webgpu";
import { reflector, vec3 } from "three/tsl";
import gsap from "gsap";
import { createEnvironment } from "../../../shared/rendering/environment";
import { createClothPhysics } from "./ClothPhysics";
import { createClothGeometry } from "./ClothGeometry";
import { createClothControls } from "./ClothControls";
import { createCanvasTextures } from "../../../shared/rendering/textures";
import { createRenderer } from "../../../shared/rendering/renderer";
import { fitOrbit } from "../../../shared/rendering/orbit";
import { loadSceneAsset } from "../../../shared/rendering/sceneAsset";

/** 平らなHTMLを正面から見せ、無風の導入後に布の物理と風を動かす。 */
export async function createClothScene(host: HTMLElement, canvas: HTMLCanvasElement) {
  // 48×30の物理格子と192×120の描画格子を分け、毎フレームの計算量を抑える。
  const [renderer, scene] = await Promise.all([
    createRenderer(host),
    loadSceneAsset("scenes/cloth.json"),
  ]);
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = true;

  const camera = scene.getObjectByName("Camera") as THREE.PerspectiveCamera;
  const environment = createEnvironment(renderer, 512);
  scene.environment = environment.texture;

  const floor = scene.getObjectByName("Floor");
  if (!(floor instanceof THREE.Mesh) || !(floor.material instanceof THREE.MeshStandardMaterial))
    throw new Error("布の床がありません。");
  // 床を基準に反射カメラを作り、揺れる布と視点の変化を同じフレームへ映す。
  // 半解像度で描画量を抑え、床の照明・影を残したまま鮮明な鏡像を重ねる。
  const reflection = reflector({ resolutionScale: 0.5, samples: 4 });
  const floorMaterial = new THREE.MeshStandardNodeMaterial().copy(floor.material);
  floorMaterial.roughness = 0.08;
  floorMaterial.metalness = 0.8;
  // 床の反射には、実際の布の鏡像を描く。
  floorMaterial.envNode = vec3(0);
  floorMaterial.emissiveNode = reflection.mul(0.8);
  floor.material = floorMaterial;
  floor.add(reflection.target);

  // 連続描画はanimation loopに任せ、HTMLのpaint中はテクスチャの更新だけを行う。
  const { textures, painted } = createCanvasTextures([canvas], renderer);
  // 読み込み済みの布・照明・床へ、HTMLと布の物理を接続する。
  const cloth = scene.getObjectByName("Cloth") as THREE.Mesh<
    THREE.PlaneGeometry,
    THREE.MeshStandardMaterial
  >;
  const picking = scene.getObjectByName("Picking") as THREE.Mesh<THREE.PlaneGeometry>;
  cloth.material.map = textures[0];
  // フォグは床の遠景に適用し、布の誌面は元のコントラストを保つ。
  cloth.material.fog = false;
  const initialPose = new Float32Array(picking.geometry.getAttribute("position").array);
  const physics = await createClothPhysics(initialPose);
  const updateGeometry = createClothGeometry(cloth, picking.geometry);
  updateGeometry(physics.positions);
  const orbit = createClothControls(camera, renderer.domElement, { physics, picking });
  // Three.Timerで表示中の時間を測り、タブ復帰時の停止時間を除く。
  const timer = new THREE.Timer();
  timer.connect(document);
  const wind = { strength: 0 };
  // 風で膨らむ布と床の映り込みに余白を取り、リサイズでも方向とズーム比率を保つ。
  fitOrbit(renderer, host, camera, orbit, {
    width: 760 * 1.4,
    height: 480 * 1.6,
    zoom: [1, 1.6],
    position: (distance) => camera.position.set(0, 0, distance),
  });
  // HTMLテクスチャの初回描画を待ち、表示交換用の画面を準備する。
  await painted;
  renderer.render(scene, camera);
  // 導入の2秒間は平面のまま表示し、その後に風圧を滑らかに立ち上げる。
  const intro = gsap.timeline().to(wind, { strength: 1, duration: 2, ease: "sine.inOut" }, 2);
  // 待機中に掴んだときは、その場で物理を始めて入力へ応答する。
  host.addEventListener(
    "pointerdown",
    () => {
      if (!wind.strength) intro.play(2);
    },
    { once: true },
  );
  renderer.setAnimationLoop((now) => {
    timer.update(now);
    orbit.update();
    // 物理更新と描画更新を順に進め、完了した姿勢を映す。
    if (wind.strength) {
      physics.update(timer.getDelta(), wind.strength);
      // 姿勢を一度GPUへ渡し、視点の描画でも同じ頂点を使う。
      updateGeometry(physics.positions);
    }
    renderer.render(scene, camera);
  });
}
