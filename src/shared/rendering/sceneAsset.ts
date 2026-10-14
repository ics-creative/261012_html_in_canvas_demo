import * as THREE from "three/webgpu";

/** シーン素材を読み込み、WebGPU用の材質として復元する。 */
export async function loadSceneAsset(url: string) {
  // モデルに保存された材質を、WebGPU用の材質として直接読み込む。
  const loader = new THREE.NodeObjectLoader();
  Object.assign(loader.nodeMaterials, {
    MeshBasicNodeMaterial: THREE.MeshBasicNodeMaterial,
    MeshStandardNodeMaterial: THREE.MeshStandardNodeMaterial,
    MeshPhysicalNodeMaterial: THREE.MeshPhysicalNodeMaterial,
  });
  // loadAsyncは内部でparseを使い、テクスチャ画像を並列に読み込む。
  const scene = await loader.loadAsync(url);
  if (!(scene instanceof THREE.Scene)) throw new Error(`シーンではない素材です: ${url}`);
  return scene;
}
