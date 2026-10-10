import * as THREE from "three/webgpu";
import gsap from "gsap";
import { createRenderer } from "../canvas/renderer";
import { observeSize } from "../canvas/resize";
import { own, onCleanup } from "../canvas/lifecycle";
import { createCanvasTextures } from "../canvas/textures";
import { createBackgroundNode, createFlowField, createForegroundMaterial } from "./materials";

/** HTML面の横幅。 */
export const width = 1200;
/** HTML面の高さ。 */
export const height = 720;

const FLOW_DURATION = 1.2;
const STAGGER = 0.08;

/** 背景の変形に合わせてHTML面を順に流し、文字の退場後に次の文字を入場させる。 */
export async function createDistortionScene(
  host: HTMLElement,
  canvases: HTMLCanvasElement[],
  signal: AbortSignal,
  onScale: (scale: number) => void,
  onStart: () => void,
  onComplete: (page: number) => void,
) {
  const renderer = await createRenderer(host, signal);
  const { textures, painted } = createCanvasTextures(canvases, renderer, signal, invalidate);
  const camera = new THREE.PerspectiveCamera(40, 1, 1, 20000);
  const background = createBackgroundNode(textures[0], textures[2]);
  const scene = new THREE.Scene();
  scene.backgroundNode = own(signal, background.color);
  const geometry = own(signal, new THREE.PlaneGeometry(width, height, 160, 96));
  const flow = own(signal, createFlowField());
  // 退場・入場の二枚を使い回し、演出の完了後に次の操作を受け付ける。
  const sheets = Array.from({ length: 2 }, createSheet);
  const [outgoing, incoming] = sheets;
  let current = 0;
  let dirty = true;

  const timeline = gsap.timeline({
    paused: true,
    onUpdate: invalidate,
    // 最後のonUpdateで描画を予約し、停止状態をHTMLへの復帰に使う。
    onComplete: () => timeline.pause(),
  });

  function createSheet() {
    const surface = createForegroundMaterial(textures[1], height, flow);
    // 描画先と、標準ぼかしが持つ中間バッファを解放する。
    for (const resource of [surface.material, surface.source, surface.blur]) own(signal, resource);
    const mesh = new THREE.Mesh(geometry, surface.material);
    mesh.frustumCulled = false;
    scene.add(mesh);
    return { ...surface, mesh };
  }

  function prepareSheet(sheet: ReturnType<typeof createSheet>, index: number, settled: boolean) {
    sheet.image.value = textures[index * 2 + 1];
    // 読み込み済みのHTMLを、ページ変更時だけぼかし用の入力へ描く。
    sheet.source.textureNeedsUpdate = true;
    sheet.motion.entry.value.setScalar(settled ? 1 : 0);
    sheet.motion.exit.value.setScalar(0);
    sheet.motion.wind.value.set(-0.4 - Math.random() * 0.2, 1).normalize();
    sheet.motion.seed.value = Math.random();
    sheet.mesh.visible = settled;
  }

  /** 風の流れを保ちながら前後のページへ切り替える。 */
  function go(step: -1 | 1) {
    // 完了した演出を片付け、毎回一つの遷移を先頭から再生する。
    timeline.clear().pause(0);
    const uniforms = background.motion;
    uniforms.fromMap.value = textures[current * 2];
    prepareSheet(outgoing, current, true);
    current = gsap.utils.wrap(0, textures.length / 2, current + step);
    prepareSheet(incoming, current, false);
    uniforms.toMap.value = textures[current * 2];
    uniforms.progress.value = 0;
    uniforms.direction.value = step;
    // 静止文字を先に描いてからHTMLを隠し、両ボタンを同じフレームで無効にする。
    renderer.render(scene, camera);
    onStart();
    // 背景の変形時間を文字の退場と入場に合わせ、終わる時刻を揃える。
    timeline.to(
      uniforms.progress,
      { value: 1, duration: FLOW_DURATION * 2, ease: "power1.inOut" },
      0,
    );
    flowTo(outgoing, "exit", 0);
    flowTo(incoming, "entry", FLOW_DURATION);
    timeline.play(0);
  }

  function flowTo(sheet: ReturnType<typeof createSheet>, phase: "entry" | "exit", at: number) {
    // xが見出し、yが説明文。開始を少しずらし、面全体の退場・入場の終了を揃える。
    if (phase === "entry") timeline.set(sheet.mesh, { visible: true }, at + STAGGER);
    else timeline.set(sheet.mesh, { visible: false }, at + FLOW_DURATION);
    for (const [offset, axis] of ["x", "y"].entries()) {
      const start = (offset + 1) * STAGGER;
      timeline.to(
        sheet.motion[phase].value,
        {
          [axis]: 1,
          duration: FLOW_DURATION - start,
          ease: phase === "entry" ? "expo.out" : "power2.inOut",
        },
        at + start,
      );
    }
  }

  function resize() {
    const viewWidth = host.clientWidth;
    const viewHeight = host.clientHeight;
    const scale = Math.min(viewWidth / width, viewHeight / height) / 1.08;
    camera.aspect = viewWidth / viewHeight;
    const aspectRatio = camera.aspect / (width / height);
    background.motion.coverScale.value.set(Math.min(1, aspectRatio), Math.min(1, 1 / aspectRatio));
    camera.position.z =
      viewHeight / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * scale);
    camera.updateProjectionMatrix();
    renderer.setSize(viewWidth, viewHeight);
    // 表示バッファの解像度にHTMLを揃え、描画の切り替え時も文字の鮮明さを保つ。
    onScale(scale);
    invalidate();
  }

  function invalidate() {
    dirty = true;
  }

  function render() {
    if (!dirty) return;
    // ぼかしがゼロの面では、中間バッファの描画も止める。
    for (const { mesh, motion, blur } of sheets) {
      if (!mesh.visible) continue;
      const entering = Math.min(motion.entry.value.x, motion.entry.value.y) < 0.92;
      const leaving = Math.max(motion.exit.value.x, motion.exit.value.y) > 0.32;
      blur.updateBeforeType = entering || leaving ? "frame" : "none";
    }
    const complete = timeline.paused() && incoming.mesh.visible;
    if (complete) incoming.mesh.visible = false;
    renderer.render(scene, camera);
    dirty = false;
    // 背景の最終描画を済ませてから、GPU文字を元HTMLへ切り替える。
    if (complete) onComplete(current);
  }

  /** アニメーションと描画用リソースを解放する。 */
  onCleanup(signal, () => timeline.kill());
  // 文字とぼかしのパイプラインを初期化時に作り、最初の操作へ備える。
  observeSize(host, resize, signal);
  renderer.render(scene, camera);
  for (const sheet of sheets) sheet.mesh.visible = false;
  renderer.setAnimationLoop(render);
  // 元HTMLの初回paintを待ち、描画済みのテクスチャで遷移を始める。
  await painted;
  return { go };
}
