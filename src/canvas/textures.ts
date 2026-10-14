import { HTMLTexture, SRGBColorSpace, type Renderer } from "three/webgpu";

/** 読み込み済みの元HTMLを直接GPUへ渡し、同じCanvas内の誌面をpaintと同期する。 */
export function createCanvasTextures(
  canvases: HTMLCanvasElement[],
  renderer: Renderer,
  render = () => {},
) {
  const canvas = renderer.domElement as HTMLCanvasElement & { requestPaint(): void };
  canvas.setAttribute("content", "drawable");
  const sources = canvases.flatMap((source) =>
    Array.from(source.querySelectorAll<HTMLElement>(":scope > [drawable]")),
  );
  // 元HTMLを描画先へ置き、入力領域とテクスチャの座標系を揃える。
  const textures = sources.map((source) => {
    canvas.append(source);
    const texture = new HTMLTexture(source);
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
      // 初回に保留されたHTML画像の転送を、最初のpaintで再開する。
      for (const texture of textures) texture.needsUpdate = true;
      painted.resolve();
    },
    { once: true },
  );
  // 以後の誌面更新はThree.jsの共有onpaintに任せ、移動先のCanvasで描画を再開する。
  canvas.addEventListener("paint", render);
  return { textures, painted: painted.promise, refresh: () => canvas.requestPaint() };
}
