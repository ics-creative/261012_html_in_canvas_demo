import * as THREE from "three/webgpu";
import { mix, rtt, screenUV, texture, uniform, uv, vec2, vec3 } from "three/tsl";
import { gaussianBlur } from "three/addons/tsl/display/GaussianBlurNode.js";
import { createRenderer } from "../canvas/renderer";
import { createCanvasTextures } from "../canvas/textures";
import { observeSize } from "../canvas/resize";
import { own, onCleanup } from "../canvas/lifecycle";
import type { HitCanvas } from "../canvas/HTMLHitTarget";

/** 生きたHTMLを共有し、ガラスの縁で背景を屈折させる。 */
export async function createGlassScene(
  host: HTMLElement,
  canvas: HitCanvas,
  controls: HTMLFormElement,
  signal: AbortSignal,
) {
  const renderer = await createRenderer(host, signal, canvas);
  const source = canvas.querySelector<HTMLElement>("[drawable]");
  if (!source) throw new Error("ガラスの描画元がありません。");
  const viewport = uniform(new THREE.Vector2());
  const size = uniform(new THREE.Vector2());
  const position = uniform(new THREE.Vector2());
  const enabled = uniform(1);
  let frame = 0;
  const resize = () => {
    const width = host.clientWidth;
    const height = host.clientHeight;
    renderer.setSize(width, height);
    viewport.value.set(width, height);
    // 外形と画面内の寸法はCSSに任せ、屈折の計算だけ同じ寸法へ合わせる。
    size.value.set(controls.offsetWidth, controls.offsetHeight);
    position.value.set(controls.offsetLeft, controls.offsetTop);
    source.style.width = `${width * devicePixelRatio}px`;
    source.style.height = `${height * devicePixelRatio}px`;
    source.style.setProperty("--page-width", `${width}px`);
    source.style.setProperty("--page-height", `${height}px`);
    // CSS変形は描画元を変えず、元HTMLの入力・選択領域だけを画面と揃える。
    source.style.transform = `scale(${1 / devicePixelRatio})`;
  };

  // HTMLの寸法を確定してから初回転送し、低解像度の画像で初期化しない。
  resize();
  const { textures, painted } = createCanvasTextures([canvas], renderer, signal, requestRender);
  const textureSize = viewport.value.clone();

  // CSSと同じカプセルの距離場を使い、形状と屈折の境界を揃える。
  const point = screenUV.mul(viewport).sub(position).sub(size.div(2));
  const radius = size.y.div(2);
  const corner = point.abs().sub(size.div(2).sub(radius));
  const distance = corner.max(0).length().sub(radius);
  // liquidGLのWebGPU実装と同じく、曲がりをベベルへ集中させて中央を平らに保つ。
  // https://github.com/naughtyduk/liquidGL/blob/main/scripts/liquidGL.js
  const edge = distance.negate().smoothstep(0, 32).oneMinus();
  // TSLのdFdyは上向き。画面のYへ揃え、中央の勾配ゼロもそのまま通す。
  const gradient = vec2(distance.dFdx(), distance.dFdy().negate()).mul(devicePixelRatio);
  const direction = gradient.div(gradient.length().max(1));
  const offset = direction.mul(edge.mul(16).add(edge.pow(8).mul(32)));
  const background = texture(textures[0], screenUV.flipY());
  // ガラスと屈折・ぼかしの余白だけを切り出し、端末の解像度を保ったまま処理する。
  const padding = 64;
  const cropSize = size.add(padding * 2);
  const cropPosition = position.sub(padding);
  const cropUV = uv().flipY().mul(cropSize).add(cropPosition).div(viewport).flipY();
  const cropped = own(
    signal,
    rtt(
      texture(textures[0], cropUV),
      (size.value.x + padding * 2) * devicePixelRatio,
      (size.value.y + padding * 2) * devicePixelRatio,
      { depthBuffer: false },
    ),
  );
  // 縮小mipmapの拡大でぼかさず、標準のガウスぼかしで階段状の輪郭をなくす。
  const blur = own(signal, gaussianBlur(cropped, devicePixelRatio, 4));
  const refracted = screenUV.mul(viewport).sub(offset);
  const sharp = texture(textures[0], refracted.div(viewport).flipY());
  const soft = blur.getTextureNode().sample(refracted.sub(cropPosition).div(cropSize).flipY());
  // 縁の屈折は鮮明に、中央の散乱は滑らかにつなぐ。
  const bent = mix(soft, sharp, edge);
  // AppleのRegularに倣い、薄い明色の層で文字のコントラストを面全体に揃える。
  const body = mix(bent.rgb, vec3(1), 0.2);
  // 白い反射面を重ねず、方向に応じた細い縁だけで厚みを見せる。
  const rim = distance.negate().smoothstep(0, 2).oneMinus();
  const light = direction.dot(vec2(-0.6, -0.8));
  const glass = mix(body, vec3(1), rim.mul(light.clamp()).mul(0.2));
  const mask = distance.negate().smoothstep(0, 1).mul(enabled);
  const material = own(
    signal,
    new THREE.MeshBasicNodeMaterial({
      colorNode: mix(background.rgb, glass, mask),
      toneMapped: false,
    }),
  );
  // 全画面の一枚で合成し、カメラ・立体メッシュ・環境マップを持たない。
  const quad = new THREE.QuadMesh(material);

  function requestRender() {
    // paintとフォーム変更を次の一描画にまとめ、ブラウザーのpaint中はGPUを更新しない。
    if (!frame) frame = requestAnimationFrame(render);
  }

  function render() {
    frame = 0;
    // 更新済みのHTMLだけを合成し、静止中は描画しない。
    enabled.value = Number(new FormData(controls).get("material") === "glass");
    quad.render(renderer);
  }

  // paint後にCanvasの寸法を再代入すると画像が消えるため、サイズ監視を先に始める。
  observeSize(
    host,
    () => {
      resize();
      // Three.jsがHTMLテクスチャを登録してから、Canvasの操作領域を更新する。
      canvas.updateElementGeometry(source);
      cropped.setSize(
        (size.value.x + padding * 2) * devicePixelRatio,
        (size.value.y + padding * 2) * devicePixelRatio,
      );
      // サイズ変更時だけ画像を確保し直し、転送は次のpaintへ任せる。
      if (!textureSize.equals(viewport.value)) {
        textures[0].dispose();
        renderer.initTexture(textures[0]);
        textureSize.copy(viewport.value);
      }
    },
    signal,
  );
  onCleanup(signal, () => {
    cancelAnimationFrame(frame);
    canvas.clearElementGeometry(source);
  });
  // 初回のHTML paintを待ってから描き、空のテクスチャを表示完了としない。
  await painted;
  signal.throwIfAborted();
  // 元フォームを直接読むため、Reactの選択状態と同期処理は持たせない。
  controls.addEventListener("change", requestRender, { signal });
  requestRender();
}
