import * as THREE from "three/webgpu";
import gsap from "gsap";
import { createRenderer } from "../canvas/renderer";
import { observeSize } from "../canvas/resize";
import { own, onCleanup } from "../canvas/lifecycle";
import { createCanvasTextures } from "../canvas/textures";
import { createPageCapture } from "./pageCapture";

const WIDTH = 760;
const HEIGHT = 480;
const COLUMNS = 20;
const ROWS = 16;

/** HTMLを分割したタイルの回転でページを切り替える。 */
export async function createTiledTransition(
  container: HTMLElement,
  canvases: HTMLCanvasElement[],
  signal: AbortSignal,
  initial: number,
  onStart: () => void,
  onComplete: (page: number) => void,
) {
  const renderer = await createRenderer(container, signal);
  const layout = createPageCapture(canvases);
  // GPU画像は初期化時の寸法で確保されるため、元HTMLを先に表示領域へ揃える。
  layout.resize(container.clientWidth, container.clientHeight);
  const capture = createCanvasTextures(canvases, renderer, signal, paint);
  const textures = capture.textures;
  const scene = new THREE.Scene();
  const view = new THREE.Group();
  scene.add(view);
  const camera = new THREE.PerspectiveCamera(40, 1, 1, 6000);
  const viewport = new THREE.Vector2();
  const material = own(signal, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  const tiles: Array<{ mesh: THREE.Mesh<THREE.PlaneGeometry>; distance: number }> = [];
  let timeline: gsap.core.Timeline | null = null;
  let current = initial;
  let requested = initial;
  let textureSizeChanged = false;
  let paintFrame = 0;

  /** 切替先を記録し、待機中なら現在のタイルの退場を始める。 */
  function transitionTo(page: number) {
    requested = page;
    if (timeline || page === current) return;

    timeline = gsap.timeline({
      paused: true,
      defaults: { duration: 0.8 },
      onUpdate: render,
      onComplete: enter,
    });
    for (const { mesh, distance } of tiles) {
      const delay = distance * 0.04;
      timeline.to(mesh.position, { z: -480, ease: "power1.in" }, delay);
      timeline.to(mesh.rotation, { y: Math.PI, ease: "power3.out" }, delay);
      timeline.to(mesh.scale, { x: 0, y: 0, ease: "power3.inOut" }, delay);
    }
    // 開始はpaint後の描画へ渡し、スクロール位置と最初のフレームを揃える。
    capture.refresh();
  }

  function enter() {
    const page = requested;
    scrollTo(page, 0);
    material.map = textures[page];
    timeline = gsap.timeline({
      onUpdate: render,
      onComplete: () => {
        timeline = null;
        current = page;
        if (requested !== page) transitionTo(requested);
        else onComplete(page);
      },
    });
    for (const { mesh, distance } of tiles) {
      mesh.position.z = Math.min(camera.position.z * 0.8, 960);
      mesh.rotation.y = -Math.PI * 2;
      mesh.scale.set(0, 0, 1);
      const delay = distance * 0.04;
      timeline.to(mesh.scale, { x: 1, y: 1, duration: 0.12 }, delay);
      timeline.to(mesh.position, { z: 0, duration: 1.2, ease: "power4.out" }, delay);
      timeline.to(mesh.rotation, { y: 0, duration: 0.6, ease: "power4.out" }, delay + 0.48);
    }
  }

  function resize() {
    const { clientWidth: width, clientHeight: height } = container;
    if (layout.resize(width, height)) textureSizeChanged = true;
    // タイル自身のscaleは演出に使い、誌面の寸法は親だけへ反映する。
    view.scale.set(width / WIDTH, height / HEIGHT, 1);
    // 同寸法の再設定でもCanvasが消去されるため、実際のサイズ変更だけを渡す。
    renderer.getSize(viewport);
    if (viewport.x !== width || viewport.y !== height) renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.position.z = height / (2 * Math.tan(THREE.MathUtils.degToRad(20)));
    camera.updateProjectionMatrix();
    // Canvasの寸法変更で失われたHTMLの描画記録を、paintしてからGPUへ転送する。
    capture.refresh();
  }

  function paint() {
    if (paintFrame) return;
    // paintの最新記録を、次の描画フレームでGPU画像へ転送する。
    paintFrame = requestAnimationFrame(() => {
      paintFrame = 0;
      if (textureSizeChanged) {
        for (const texture of textures) texture.dispose();
        for (const texture of textures) {
          renderer.initTexture(texture);
          // 初回転送の保留を終え、次の描画で最新のHTMLをアップロードする。
          texture.needsUpdate = true;
        }
        textureSizeChanged = false;
      }
      render();
      if (timeline?.paused()) {
        onStart();
        timeline.play();
      }
    });
  }

  function render() {
    // リサイズ後のHTML記録とGPU寸法が揃った時点で描画する。
    if (textureSizeChanged) return;
    renderer.render(scene, camera);
  }

  function scrollTo(page: number, top: number) {
    layout.scrollTo(page, top);
    capture.refresh();
  }

  /** アニメーションと描画用リソースを解放する。 */
  onCleanup(signal, () => {
    timeline?.kill();
    cancelAnimationFrame(paintFrame);
  });
  material.map = textures[current];

  for (let column = 0; column < COLUMNS; column++) {
    for (let row = 0; row < ROWS; row++) {
      const geometry = own(signal, new THREE.PlaneGeometry(WIDTH / COLUMNS, HEIGHT / ROWS));
      const uv = geometry.getAttribute("uv");
      // 各タイルへ、HTML全体の対応する矩形を割り当てる。
      for (let vertex = 0; vertex < uv.count; vertex++) {
        uv.setXY(vertex, (uv.getX(vertex) + column) / COLUMNS, (uv.getY(vertex) + row) / ROWS);
      }
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        ((column + 0.5) / COLUMNS - 0.5) * WIDTH,
        ((row + 0.5) / ROWS - 0.5) * HEIGHT,
        0,
      );
      tiles.push({ mesh, distance: Math.hypot(column, row) });
      view.add(mesh);
    }
  }
  observeSize(container, resize, signal);
  // 元HTMLの初回paintを待ち、転送済みのテクスチャで遷移を始める。
  await capture.painted;
  signal.throwIfAborted();
  return { transitionTo, scrollTo };
}
