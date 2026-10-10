import * as THREE from "three/webgpu";
import { onCleanup } from "./lifecycle";

/** WebGPUを初期化し、描画先と解放処理を同じ画面へ取り付ける。 */
export async function createRenderer(
  host: HTMLElement,
  signal: AbortSignal,
  canvas?: HTMLCanvasElement,
) {
  const backend = new THREE.WebGPUBackend({ canvas });
  const renderer = new THREE.Renderer(backend, { antialias: true });
  renderer.library = new THREE.StandardNodeLibrary();
  await renderer.init();
  onCleanup(signal, () => {
    // 終了時は、シーンの素材を解放してからGPUを閉じる。
    renderer.setAnimationLoop(null);
    queueMicrotask(() => renderer.dispose());
    // Reactが持つCanvasは再初期化でも残し、ここで作った描画先だけを削除する。
    if (!canvas) renderer.domElement.remove();
  });
  signal.throwIfAborted();
  // HTMLの最初のpaintより前に、遅延生成されるGPUCanvasContextを確定する。
  renderer.getContext();
  renderer.setPixelRatio(devicePixelRatio);
  if (!canvas) host.append(renderer.domElement);
  return renderer;
}
