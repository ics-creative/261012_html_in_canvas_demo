import { HTMLTexture, SRGBColorSpace, type Renderer } from "three/webgpu";
import { own, onCleanup } from "./lifecycle";

/** 読み込み済みの元HTMLを直接GPUへ渡し、同じCanvas内の誌面をpaintと同期する。 */
export function createCanvasTextures(
  canvases: HTMLCanvasElement[],
  renderer: Renderer,
  signal: AbortSignal,
  render = () => {},
) {
  const canvas = renderer.domElement as HTMLCanvasElement & { requestPaint(): void };
  canvas.setAttribute("content", "drawable");
  const sources = canvases.flatMap((owner) =>
    Array.from(owner.querySelectorAll<HTMLElement>(":scope > [drawable]"), (source) => ({
      source,
      owner,
    })),
  );
  // 再初期化でも同じHTMLを使えるよう、移動した元要素を終了時に戻す。
  onCleanup(signal, () => sources.forEach(({ source, owner }) => owner.append(source)));
  const textures = sources.map(({ source }) => {
    canvas.append(source);
    const texture = own(signal, new HTMLTexture(source));
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 8;
    // 元HTMLの解像度を保ち、mipmapで斜めに縮小される文字のちらつきを抑える。
    // 元HTMLのpaintごとに、同じテクスチャのGPU画像を更新する。
    texture.generateMipmaps = true;
    return texture;
  });
  // 全誌面を最初のpaintへ登録し、後からめくるページの初回描画も揃える。
  // 全ページのテクスチャを初期化し、すばやいページ送りに備える。
  for (const texture of textures) renderer.initTexture(texture);
  const painted = Promise.withResolvers<void>();
  canvas.addEventListener(
    "paint",
    () => {
      // 再利用したHTMLの変更通知が空でも、初回に保留された画像転送を再開する。
      for (const texture of textures) texture.needsUpdate = true;
      painted.resolve();
    },
    { once: true, signal },
  );
  // 起動中の離脱でも初期化の待機を終える。
  onCleanup(signal, painted.resolve);
  // 以後の誌面更新はThree.jsの共有onpaintに任せ、移動先のCanvasで描画を再開する。
  canvas.addEventListener("paint", render, { signal });
  return { textures, painted: painted.promise, refresh: () => canvas.requestPaint() };
}
