import * as THREE from "three/webgpu";
import { float, luminance, mix, refract, screenUV, texture, uniform, vec2, vec3 } from "three/tsl";
import { createRenderer } from "../canvas/renderer";
import { createCanvasTextures } from "../canvas/textures";
import { observeSize } from "../canvas/resize";
import { own, onCleanup } from "../canvas/lifecycle";
import type { HitCanvas } from "../canvas/HTMLHitTarget";

/** 生きたHTMLを共有し、曲面の法線とSnellの法則からガラスの屈折を描く。 */
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
  const labels = Array.from(controls.querySelectorAll<HTMLElement>(":scope > div"), (element) => ({
    element,
    bounds: uniform(new THREE.Vector4()),
  }));
  let frame = 0;
  const resize = () => {
    const width = host.clientWidth;
    const height = host.clientHeight;
    renderer.setSize(width, height);
    viewport.value.set(width, height);
    // 外形と画面内の寸法はCSSに任せ、屈折の計算だけ同じ寸法へ合わせる。
    size.value.set(controls.offsetWidth, controls.offsetHeight);
    position.value.set(controls.offsetLeft, controls.offsetTop);
    // 文字の周囲だけを減光し、余白には写真の明るさをそのまま通す。
    for (const { element, bounds } of labels) {
      bounds.value.set(
        element.offsetLeft + element.offsetWidth / 2,
        element.offsetTop + element.offsetHeight / 2,
        element.offsetWidth,
        element.offsetHeight,
      );
    }
    source.style.width = `${width * devicePixelRatio}px`;
    source.style.height = `${height * devicePixelRatio}px`;
    source.style.setProperty("--page-width", `${width}px`);
    source.style.setProperty("--page-height", `${height}px`);
    // CSS変形は描画元を変えず、元HTMLの入力・選択領域だけを画面と揃える。
    source.style.transform = `scale(${1 / devicePixelRatio})`;
    canvas.updateElementGeometry(source);
  };

  // HTMLの寸法を確定してから初回転送し、低解像度の画像で初期化しない。
  resize();
  const { textures, painted } = createCanvasTextures([canvas], renderer, signal, requestRender);
  const textureSize = viewport.value.clone();

  // CSSと同じカプセルの距離場から、中央まで滑らかにつながるレンズを作る。
  const point = screenUV.mul(viewport).sub(position).sub(size.div(2));
  const radius = size.y.div(2);
  const corner = point.abs().sub(size.div(2).sub(radius));
  const distance = corner.max(0).length().sub(radius);
  // Convex squircleの断面。縁から中央へ勾配を弱め、背景を連続的に拡大する。
  const depth = distance.negate().div(radius).clamp();
  const surface = depth.oneMinus().pow(4).oneMinus().pow(0.25).mul(radius);
  // TSLのdFdyは上向き、画面のYは下向き。法線を画面座標へ揃えて上下の屈折を統一する。
  const slope = vec2(surface.dFdx(), surface.dFdy().negate()).mul(devicePixelRatio);
  const normal = vec3(slope.negate(), 1).normalize();
  // Snellの法則で曲げた光を背景までたどる。厚みと法線を同じ曲面から求める。
  const ray = refract(vec3(0, 0, -1), normal, 1 / 1.5);
  const offset = ray.xy.mul(surface.add(8)).div(ray.z.negate()).div(viewport);
  const edge = normal.z.oneMinus();
  const light = vec3(-0.4, -0.6, 1).normalize();
  const highlight = normal.dot(light).clamp().pow(16).mul(edge).mul(0.4);
  const background = texture(textures[0], screenUV.flipY());
  // 散乱は中央で柔らかく、縁では屈折した輪郭を残す。ぼかし幅はCSS pxに揃える。
  const mip = Math.log2(devicePixelRatio);
  const bent = texture(textures[0], screenUV.add(offset).flipY()).level(edge.oneMinus().add(mip));
  const ambient = texture(textures[0], screenUV.add(normal.xy.mul(32).div(viewport)).flipY()).level(
    float(mip + 4),
  );
  const dimming = labels
    .map(({ bounds }) => {
      const outside = point.add(size.div(2)).sub(bounds.xy).abs().sub(bounds.zw.div(2));
      return outside.max(0).length().smoothstep(0, 24).oneMinus();
    })
    .reduce((combined, mask) => combined.max(mask));
  // 明るい背景ほど文字の近くを減光する。透過と反射を混ぜ、白い光を足しすぎない。
  const transmission = bent.rgb.mul(
    dimming.mul(luminance(bent.rgb).smoothstep(0.08, 0.6)).mul(0.6).oneMinus(),
  );
  const reflection = mix(ambient.rgb.mul(0.4), vec3(1), normal.dot(light).clamp().pow(2));
  // Fresnel反射を近似し、中央の反射率は4%、斜めの縁ほど周囲の光を返す。
  const fresnel = edge.pow(4).mul(0.4).add(0.04);
  const rim = distance.abs().smoothstep(0, 1).oneMinus();
  const glass = mix(transmission, reflection, fresnel)
    .add(highlight)
    .add(rim.mul(normal.dot(light).abs().pow(4)).mul(0.2));
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
