import { Container, Texture, WebGPURenderer } from "pixi.js";
import { createHTMLCapture } from "./capture";
import { onCleanup } from "./lifecycle";

/** PixiJSのWebGPU描画先を作り、画面と一緒に解放する。 */
export async function createPixi(host: HTMLElement, signal: AbortSignal) {
  const renderer = new WebGPURenderer();
  await renderer.init({
    backgroundAlpha: 0,
    antialias: true,
    resolution: devicePixelRatio,
    autoDensity: true,
  });
  const stage = new Container({ eventMode: "none" });
  onCleanup(signal, () => {
    // 演出を先に停止し、後続のテクスチャ解放より前にGPUの参照を外す。
    queueMicrotask(() => {
      // 親のバッチを先に解放し、キャッシュ画像を持つ子の破棄時に購読を残さない。
      const children = stage.removeChildren();
      stage.destroy();
      for (const child of children) child.destroy({ children: true });
      renderer.destroy({ removeView: true });
    });
  });
  signal.throwIfAborted();
  host.append(renderer.canvas);
  return { renderer, stage, render: () => renderer.render(stage) };
}

/** 元HTMLの最初のpaintを待ち、以後も同じテクスチャを更新する。 */
export function pixiTexture(canvas: HTMLCanvasElement, signal: AbortSignal, render: () => void) {
  const texture = Texture.from(canvas);
  // HTMLのpaintでCanvasの寸法が変わるため、Spriteの頂点も更新する。
  texture.dynamic = true;
  onCleanup(signal, () => queueMicrotask(() => texture.destroy(true)));
  const capture = createHTMLCapture(
    canvas,
    () => {
      texture.source.update();
      render();
    },
    signal,
  );
  return { texture, ...capture };
}
