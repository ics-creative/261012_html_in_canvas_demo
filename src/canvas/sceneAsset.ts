import * as THREE from "three/webgpu";

/** シーン素材を読み込み、WebGPU用の材質として復元する。 */
export async function loadSceneAsset(url: string) {
  const response = await fetch(url);
  // HTTPで展開済みのJSONは直接読み、圧縮ファイルを標準APIで展開する。
  const data =
    url.endsWith(".gz") && response.headers.get("Content-Encoding") !== "gzip"
      ? await new Response(
          (await response.blob()).stream().pipeThrough(new DecompressionStream("gzip")),
        ).json()
      : await response.json();
  // parseAsyncは画像を一枚ずつ待つため、並列で読む標準parseをPromiseに包む。
  const scene = await new Promise<THREE.Object3D>((resolve, reject) => {
    const manager = new THREE.LoadingManager();
    manager.onError = (path) => reject(new Error(`シーン素材を読み込めません: ${path}`));
    // モデルに保存された材質を、WebGPU用の材質として直接読み込む。
    const loader = new THREE.NodeObjectLoader(manager);
    Object.assign(loader.nodeMaterials, {
      MeshBasicNodeMaterial: THREE.MeshBasicNodeMaterial,
      MeshStandardNodeMaterial: THREE.MeshStandardNodeMaterial,
      MeshPhysicalNodeMaterial: THREE.MeshPhysicalNodeMaterial,
    });
    loader.setResourcePath(THREE.LoaderUtils.extractUrlBase(url)).parse(data, resolve);
  });
  if (!(scene instanceof THREE.Scene)) throw new Error(`シーンではない素材です: ${url}`);
  return scene;
}
