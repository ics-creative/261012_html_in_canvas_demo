import * as THREE from "three/webgpu";
import { createRenderer } from "../canvas/renderer";
import { createOrbit, createPointerRay, fitOrbit } from "../canvas/orbit";
import { createHTMLHitTarget, type HitCanvas, type HTMLPoint } from "../canvas/HTMLHitTarget";
import { onCleanup } from "../canvas/lifecycle";
import { createCanvasTextures } from "../canvas/textures";
import { createRetroComputer } from "./RetroComputer";
import { createRetroWorld } from "./RetroWorld";

/** Three.jsのHTMLTextureで、入力できるHTMLをWebGPUの曲面画面へ直接描く。 */
export async function createRetroScene(
  host: HTMLElement,
  canvas: HitCanvas,
  signal: AbortSignal,
  ready: Promise<void>,
) {
  const renderer = await createRenderer(host, signal, canvas);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  const world = createRetroWorld(renderer, camera, signal);
  await ready;
  signal.throwIfAborted();
  // 描画と入力を同じCanvasにまとめ、元HTMLのpaintをThree.jsで直接受け取る。
  const { textures, painted } = createCanvasTextures([canvas], renderer, signal);
  const model = createRetroComputer(textures[0]);
  world.scene.add(model.computer);
  onCleanup(signal, model.dispose);
  const orbit = createOrbit(camera, host, signal);
  orbit.target.set(0, 2.4, -0.4);
  orbit.maxPolarAngle = Math.PI * 0.48;
  orbit.minPolarAngle = 0.2;
  orbit.mouseButtons.RIGHT = undefined;
  fitOrbit(renderer, host, camera, orbit, signal, {
    width: 8,
    height: 8,
    zoom: [0.4, 2],
    position: (distance) =>
      camera.position.set(distance * 0.48, 2 + distance * 0.2, distance * 0.88),
  });
  const source = textures[0].image;
  const size = { width: source.clientWidth, height: source.clientHeight };
  const target = createHTMLHitTarget(canvas, [source], camera, size);
  onCleanup(signal, target.hide);
  const aim = createPointerRay(camera, canvas);
  const press = new THREE.Vector2();
  orbit.addEventListener("change", target.hide);

  function hit(event: MouseEvent): HTMLPoint | null {
    // 筐体の向こう側に隠れた画面へは入力を通さない。
    const point = aim(event).intersectObject(model.computer, true)[0];
    if (point?.object !== model.screen || !point.uv || !point.face) return null;
    return {
      index: 0,
      x: point.uv.x * size.width,
      y: (1 - point.uv.y) * size.height,
      mesh: model.screen,
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
    { capture: true, signal },
  );
  for (const type of ["pointerdown", "contextmenu"] as const) {
    host.addEventListener(
      type,
      (event) => {
        const point = hit(event);
        target.move(point, event);
        if (type === "pointerdown") press.set(event.clientX, event.clientY);
        // 画面上のドラッグは選択へ渡し、筐体と背景だけで視点を回す。
        // 右クリックはOrbitControlsへ渡さず、ブラウザーの標準メニューを開く。
        if (point || type === "contextmenu") event.stopImmediatePropagation();
      },
      { capture: true, signal },
    );
  }
  host.addEventListener(
    "pointerup",
    (event) => {
      // ダブルクリックの単語選択は変えず、ドラッグした終点だけを曲面へ合わせる。
      if (event.button === 0 && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 4) {
        target.finish(hit(event), event);
      }
    },
    { capture: true, signal },
  );
  host.addEventListener("pointerleave", target.hide, { signal });

  function render() {
    orbit.update();
    world.render();
  }
  // サイズと曲面の入力領域を揃え、最初のHTML paint後に描画を開始する。
  await painted;
  signal.throwIfAborted();
  render();
  renderer.setAnimationLoop(render);
}
