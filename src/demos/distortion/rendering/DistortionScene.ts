import * as THREE from "three/webgpu";
import gsap from "gsap";
import { createRenderer } from "../../../shared/rendering/renderer";
import { observeSize } from "../../../shared/rendering/resize";
import { createCanvasTextures } from "../../../shared/rendering/textures";
import { createBackgroundNode, createFlowField, createForegroundMaterial } from "./materials";

/** HTML面の横幅。 */
export const width = 1200;
/** HTML面の高さ。 */
export const height = 720;

const FLOW_DURATION = 1.2;
const STAGGER = 0.08;

/** 動画背景の変形に合わせてHTML面を順に流し、文字を入れ替える。 */
export async function createDistortionScene(
  host: HTMLElement,
  canvases: HTMLCanvasElement[],
  videos: HTMLVideoElement[],
  onScale: (scale: number) => void,
  onStart: () => void,
  onComplete: (page: number) => void,
) {
  const renderer = await createRenderer(host);
  // 表示中と遷移先の動画を、背景テクスチャへ渡す。
  const backgrounds = videos.map((video) => {
    const texture = new THREE.VideoTexture(video);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  });
  // 最初の動画のデコードを待ち、Loadingから描画済みの背景へ切り替える。
  await videos[0].play();
  const { textures, painted } = createCanvasTextures(canvases, renderer);
  const camera = new THREE.PerspectiveCamera(40, 1, 1, 20000);
  // 入力を別動画から初期化し、切り替え元と先のUniformを分離する。
  const background = createBackgroundNode(backgrounds[0], backgrounds[1]);
  const scene = new THREE.Scene();
  scene.backgroundNode = background.color;
  const geometry = new THREE.PlaneGeometry(width, height, 160, 96);
  const flow = createFlowField();
  // 退場・入場の二枚を使い回し、演出の完了後に次の操作を受け付ける。
  const sheets = Array.from({ length: 2 }, createSheet);
  const [outgoing, incoming] = sheets;
  let current = 0;

  const timeline = gsap.timeline({
    paused: true,
    // 描画ループで最終フレームを確定し、停止状態をHTMLへの復帰に使う。
    onComplete: () => timeline.pause(),
  });

  function createSheet() {
    const surface = createForegroundMaterial(textures[0], height, flow);
    const mesh = new THREE.Mesh(geometry, surface.material);
    mesh.frustumCulled = false;
    scene.add(mesh);
    return { ...surface, mesh };
  }

  function prepareSheet(sheet: ReturnType<typeof createSheet>, index: number, settled: boolean) {
    sheet.image.value = textures[index];
    // 元HTMLを、ページ変更時だけぼかし用の入力へ描く。
    sheet.source.textureNeedsUpdate = true;
    sheet.motion.entry.value.setScalar(settled ? 1 : 0);
    sheet.motion.exit.value.setScalar(0);
    sheet.motion.wind.value.set(-0.4 - Math.random() * 0.2, 1).normalize();
    sheet.motion.seed.value = Math.random();
    sheet.mesh.visible = settled;
  }

  /** 風の流れを保ちながら前後のページへ切り替える。 */
  async function go(step: -1 | 1) {
    // 完了した演出を片付け、毎回一つの遷移を先頭から再生する。
    timeline.clear().pause(0);
    const next = gsap.utils.wrap(0, videos.length, current + step);
    const uniforms = background.motion;
    uniforms.fromMap.value = backgrounds[current];
    uniforms.toMap.value = backgrounds[next];
    uniforms.progress.value = 0;
    prepareSheet(outgoing, current, true);
    incoming.mesh.visible = false;
    // 静止文字を先に描いてからHTMLを隠し、両ボタンを同じフレームで無効にする。
    renderer.render(scene, camera);
    onStart();
    // 遷移先の最初のフレームを待ってから、背景と文字の演出を始める。
    await videos[next].play();
    current = next;
    prepareSheet(incoming, current, false);
    uniforms.direction.value = step;
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
    const aspectRatio = camera.aspect / (videos[0].videoWidth / videos[0].videoHeight);
    background.motion.coverScale.value.set(Math.min(1, aspectRatio), Math.min(1, 1 / aspectRatio));
    camera.position.z =
      viewHeight / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * scale);
    camera.updateProjectionMatrix();
    renderer.setSize(viewWidth, viewHeight);
    // 表示バッファの解像度にHTMLを揃え、描画の切り替え時も文字の鮮明さを保つ。
    onScale(scale);
  }

  function render() {
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
    // 背景の最終描画を済ませてから、GPU文字を元HTMLへ切り替える。
    if (complete) {
      videos.forEach((video, index) => {
        if (index !== current) video.pause();
      });
      onComplete(current);
    }
  }

  // 文字とぼかしのパイプラインを初期化時に作り、最初の操作へ備える。
  observeSize(host, resize);
  renderer.render(scene, camera);
  for (const sheet of sheets) sheet.mesh.visible = false;
  renderer.setAnimationLoop(render);
  // 元HTMLの初回paintを待ち、描画済みのテクスチャで遷移を始める。
  await painted;
  return { go };
}
