import * as THREE from "three/webgpu";
import { onCleanup } from "./lifecycle";

/** シーン素材を読み込み、ページ離脱時にGPU資源を解放する。 */
export async function loadSceneAsset(
  url: string,
  signal: AbortSignal,
  loader = new THREE.ObjectLoader(),
) {
  const response = await fetch(url, { signal });
  // HTTPで展開済みのJSONは直接読み、圧縮ファイルを標準APIで展開する。
  const data =
    url.endsWith(".gz") && response.headers.get("Content-Encoding") !== "gzip"
      ? await new Response(
          (await response.blob()).stream().pipeThrough(new DecompressionStream("gzip")),
        ).json()
      : await response.json();
  // parseAsyncは画像を一枚ずつ待つため、並列で読む標準parseをPromiseに包む。
  const scene = await new Promise<THREE.Object3D>((resolve, reject) => {
    loader.manager = new THREE.LoadingManager();
    loader.manager.onError = (path) => reject(new Error(`シーン素材を読み込めません: ${path}`));
    loader.setResourcePath(THREE.LoaderUtils.extractUrlBase(url)).parse(data, resolve);
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
