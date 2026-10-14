import { Container, Texture, WebGPURenderer } from "pixi.js";
import { createHTMLCapture } from "./capture";

/** PixiJSのWebGPU描画先と透明なステージを用意する。 */
export async function createPixi(host: HTMLElement) {
  const renderer = new WebGPURenderer();
  await renderer.init({
    backgroundAlpha: 0,
    antialias: true,
    resolution: devicePixelRatio,
    autoDensity: true,
  });
  const stage = new Container({ eventMode: "none" });
  host.append(renderer.canvas);
  return { renderer, stage, render: () => renderer.render(stage) };
}

/** 元HTMLの最初のpaintを待ち、以後も同じテクスチャを更新する。 */
export function pixiTexture(canvas: HTMLCanvasElement, render: () => void) {
  const texture = Texture.from(canvas);
  // HTMLのpaintでCanvasの寸法が変わるため、Spriteの頂点も更新する。
  texture.dynamic = true;
  const capture = createHTMLCapture(canvas, () => {
    texture.source.update();
    render();
  });
  return { texture, ...capture };
}
