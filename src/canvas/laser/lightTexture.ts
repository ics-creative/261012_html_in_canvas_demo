import { Texture } from "pixi.js";

/** 切断線・閃光・火花で共有する発光画像を読み込む。利用後はdestroy(true)で解放する。 */
export async function createLightTexture(color: "blue" | "orange") {
  // 両端が透過する画像を読み込み、長い残光と短い火花で共有する。
  const response = await fetch(new URL(`./assets/${color}.png`, import.meta.url));
  const image = await createImageBitmap(await response.blob());
  // 小さな火花でも白い芯を拾えるよう、縮小用の画像をGPU側で生成する。
  const texture = Texture.from({ resource: image, autoGenerateMipmaps: true });
  texture.source.once("destroy", () => image.close());
  return texture;
}
