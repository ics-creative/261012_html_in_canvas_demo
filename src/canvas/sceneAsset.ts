import * as THREE from "three/webgpu";
import { onCleanup } from "./lifecycle";

/** 書き出したシーンを読み込み、共有する素材と影を一度だけ解放する。 */
export async function loadSceneAsset(url: string, signal: AbortSignal) {
  const response = await fetch(url, { signal });
  // 頂点を持つ大きなシーンだけgzip素材にし、標準APIで展開する。
  const data = url.endsWith(".gz")
    ? await new Response(
        (await response.blob()).stream().pipeThrough(new DecompressionStream("gzip")),
      ).json()
    : await response.json();
  // parseAsyncは画像を一枚ずつ待つため、並列で読む標準parseをPromiseに包む。
  const scene = await new Promise<THREE.Object3D>((resolve, reject) => {
    const manager = new THREE.LoadingManager();
    manager.onError = (path) => reject(new Error(`シーン素材を読み込めません: ${path}`));
    new THREE.ObjectLoader(manager)
      .setResourcePath(THREE.LoaderUtils.extractUrlBase(url))
      .parse(data, resolve);
  });
  if (!(scene instanceof THREE.Scene)) throw new Error(`シーンではない素材です: ${url}`);
  const resources = new Set<{ dispose(): void }>();
  scene.traverse((object) => {
    resources.add(object);
    if (object instanceof THREE.Mesh) {
      resources.add(object.geometry);
      for (const material of [object.material].flat()) {
        resources.add(material);
        for (const value of Object.values(material)) {
          if (value instanceof THREE.Texture) resources.add(value);
        }
      }
    }
  });
  // 読み込み中に離脱しても解放し、後から追加する動的な紙は各シーンで管理する。
  onCleanup(signal, () => resources.forEach((resource) => resource.dispose()));
  signal.throwIfAborted();
  return scene;
}
