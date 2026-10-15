import * as THREE from "three/webgpu";
import { createRenderer } from "../../../shared/rendering/renderer";
import { createOrbit, createPointerRay, fitOrbit } from "../../../shared/rendering/orbit";
import {
  createHtmlHitTarget,
  type HitCanvas,
  type HtmlPoint,
} from "../../../shared/rendering/HtmlHitTarget";
import { createCanvasTextures } from "../../../shared/rendering/textures";
import { createCrt3dWorld } from "./Crt3dWorld";
import { loadSceneAsset } from "../../../shared/rendering/sceneAsset";

/** Three.jsのHTMLTextureで、入力できるHTMLをWebGPUの曲面画面へ直接描く。 */
export async function createCrt3dScene(host: HTMLElement, canvas: HitCanvas) {
  const [renderer, scene] = await Promise.all([
    createRenderer(host, canvas),
    loadSceneAsset("scenes/crt-3d.json"),
  ]);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  const renderWorld = createCrt3dWorld(renderer, scene, camera);
  // 描画と入力を同じCanvasにまとめ、元HTMLのpaintをThree.jsで直接受け取る。
  const { textures, painted } = createCanvasTextures([canvas], renderer);
  const screen = scene.getObjectByName("screen");
  if (!(screen instanceof THREE.Mesh) || !(screen.material instanceof THREE.MeshBasicNodeMaterial))
    throw new Error("CRTの画面がありません。");
  // CRTらしさは、画面ガラスの曲率で表現する。
  screen.material.map = textures[0];
  const orbit = createOrbit(camera, host);
  orbit.target.set(0, 2.4, -0.4);
  orbit.maxPolarAngle = Math.PI * 0.48;
  orbit.minPolarAngle = 0.2;
  orbit.mouseButtons.RIGHT = undefined;
  fitOrbit(renderer, host, camera, orbit, {
    width: 8,
    height: 8,
    zoom: [0.4, 2],
    position: (distance) =>
      camera.position.set(distance * 0.48, 2 + distance * 0.2, distance * 0.88),
  });
  const source = textures[0].image;
  const size = { width: source.clientWidth, height: source.clientHeight };
  const target = createHtmlHitTarget(canvas, [source], camera, size);
  const aim = createPointerRay(camera, canvas);
  const press = new THREE.Vector2();
  orbit.addEventListener("change", target.hide);

  function hit(event: MouseEvent): HtmlPoint | null {
    // 筐体より手前に見える画面を、入力の対象にする。
    const point = aim(event).intersectObject<THREE.Mesh>(scene)[0];
    if (point?.object !== screen || !point.uv || !point.face) return null;
    return {
      index: 0,
      x: point.uv.x * size.width,
      y: (1 - point.uv.y) * size.height,
      mesh: point.object,
      triangle: [point.face.a, point.face.b, point.face.c],
      flipX: false,
    };
  }

  host.addEventListener(
    "pointermove",
    (event) => {
      const point = hit(event);
      target.move(point, event);
      host.style.cursor = point ? "auto" : "grab";
    },
    { capture: true },
  );
  for (const type of ["pointerdown", "contextmenu"] as const) {
    host.addEventListener(
      type,
      (event) => {
        const point = hit(event);
        target.move(point, event);
        if (type === "pointerdown") press.set(event.clientX, event.clientY);
        // 画面上のドラッグは選択へ渡し、筐体と背景だけで視点を回す。
        // 右クリックは、ブラウザーの標準メニューを開く。
        if (point || type === "contextmenu") event.stopImmediatePropagation();
      },
      { capture: true },
    );
  }
  host.addEventListener(
    "pointerup",
    (event) => {
      // ダブルクリックは標準の単語選択へ任せ、ドラッグの終点を曲面へ合わせる。
      if (event.button === 0 && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 4) {
        target.finish(hit(event), event);
      }
    },
    { capture: true },
  );
  host.addEventListener("pointerleave", target.hide);

  function render() {
    orbit.update();
    renderWorld();
  }
  // サイズと曲面の入力領域を揃え、最初のHTML paint後に描画を開始する。
  await painted;
  render();
  renderer.setAnimationLoop(render);
}
