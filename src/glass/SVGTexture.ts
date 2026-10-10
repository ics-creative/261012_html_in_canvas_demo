import { createContext, destroyContext, domToCanvas } from "modern-screenshot";
import { CanvasTexture, SRGBColorSpace } from "three/webgpu";
import { onCleanup, own } from "../canvas/lifecycle";

/** HTML・CSS・画像をforeignObjectへ埋め込み、ガラスの背面テクスチャを更新する。 */
export async function createSVGTextures(
  source: HTMLElement,
  signal: AbortSignal,
  render: () => void,
) {
  // 埋め込んだJPEG XLとスタイルを再利用し、背面画像の更新に使う。
  const context = await createContext(source, {
    scale: devicePixelRatio,
    fetch: { requestInit: { signal }, placeholderImage: "" },
    features: { restoreScrollPosition: true, fixSvgXmlDecode: false },
  });
  const texture = own(signal, new CanvasTexture(document.createElement("canvas")));
  texture.colorSpace = SRGBColorSpace;
  texture.generateMipmaps = false;
  let capturing = false;
  let dirty = false;
  let frame = 0;
  onCleanup(signal, () => {
    cancelAnimationFrame(frame);
    if (!capturing) destroyContext(context);
  });
  signal.throwIfAborted();

  async function capture() {
    frame = 0;
    capturing = true;
    dirty = false;
    try {
      context.width = source.clientWidth;
      context.height = source.clientHeight;
      const image = await domToCanvas(context);
      if (signal.aborted) return;
      // 大きさが変わるときだけGPU画像を作り直し、端末の解像度をそのまま保つ。
      if (texture.image.width !== image.width || texture.image.height !== image.height) {
        texture.dispose();
      }
      texture.image = image;
      texture.needsUpdate = true;
      render();
    } finally {
      capturing = false;
      if (signal.aborted) destroyContext(context);
      else if (dirty) refresh();
    }
  }

  function refresh() {
    // SVG化は一回ずつ実行し、連続スクロールを最新の位置へまとめる。
    dirty = true;
    if (!capturing && !frame) {
      frame = requestAnimationFrame(async () => {
        try {
          await capture();
        } catch (error) {
          if (!signal.aborted) console.error(error);
        }
      });
    }
  }

  source.addEventListener("scroll", refresh, { capture: true, passive: true, signal });
  return { textures: [texture], painted: capture(), refresh };
}
