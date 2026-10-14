import * as THREE from "three/webgpu";

/** WebGPUを初期化し、HTMLの描画に使うCanvasを準備する。 */
export async function createRenderer(host: HTMLElement, canvas?: HTMLCanvasElement) {
  const backend = new THREE.WebGPUBackend({ canvas });
  const renderer = new THREE.Renderer(backend, { antialias: true });
  renderer.library = new THREE.StandardNodeLibrary();
  await renderer.init();
  // HTMLの最初のpaintより前に、遅延生成されるGPUCanvasContextを確定する。
  renderer.getContext();
  renderer.setPixelRatio(devicePixelRatio);
  if (!canvas) host.append(renderer.domElement);
  return renderer;
}
