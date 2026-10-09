import { Container, Filter, Sprite, Texture } from "pixi.js";
import gsap from "gsap";

import { CRTFilter } from "pixi-filters/crt";
import { GlitchFilter } from "pixi-filters/glitch";
import { AdvancedBloomFilter } from "pixi-filters/advanced-bloom";
import { createPixi, pixiTexture } from "../canvas/pixi";
import { onCleanup } from "../canvas/lifecycle";
import { observeSize } from "../canvas/resize";

/** フォントとPixiJSの準備後、HTMLフォームへCRTとグリッチを重ねる。 */
export async function createCRTDisplay(
  host: HTMLElement,
  canvas: HTMLCanvasElement,
  form: HTMLFormElement,
  effects: HTMLInputElement,
  signal: AbortSignal,
) {
  const { renderer, stage, render } = await createPixi(host, signal);
  const started = gsap.ticker.time;
  // 走査線とノイズは控え、中央の入力欄を保ちながら縁の暗さを戻す。
  const crt = new CRTFilter({
    curvature: 1.8,
    lineWidth: 2,
    lineContrast: 0.32,
    noise: 0.04,
    vignetting: 0.12,
    vignettingAlpha: 0.56,
    vignettingBlur: 0.4,
  });
  const glitch = new GlitchFilter({
    slices: 48,
    average: true,
    offset: 4,
    fillMode: 1,
    minSize: 2,
    red: { x: 2.8, y: 0.6 },
    green: { x: 0, y: -0.4 },
    blue: { x: -2.8, y: 0.6 },
  });
  const bloom = new AdvancedBloomFilter({
    threshold: 0.6,
    bloomScale: 0.32,
    brightness: 0.92,
    blur: 4,
  });
  const filters = [glitch, bloom, crt];
  const cached = stage.addChild(new Container());
  const sprite = cached.addChild(new Sprite());
  // 発光はHTML・強度・ON/OFFが変わるときだけ計算する。
  sprite.filters = [bloom];
  cached.cacheAsTexture({ resolution: devicePixelRatio, antialias: false });
  stage.filters = [glitch, crt];
  stage.filterArea = renderer.screen;
  for (const filter of filters) {
    filter.resolution = "inherit";
    // 元HTMLの文字は既にアンチエイリアス済みなので、中間画像のMSAAは不要。
    filter.antialias = "off";
  }
  renderer.canvas.style.visibility = "hidden";

  let time = 0;
  let nextBurst = 0.4;
  let burstEnd = 0;
  let glitchFrame = 0;
  let protectedRanges: { start: number; end: number }[] = [];

  function toggleEffects() {
    for (const filter of filters) filter.enabled = effects.checked;
    // 発光もキャッシュから外し、OFFでフィルターのないフォームへ戻す。
    cached.updateCacheTexture();
  }

  // DOMのチェック状態を使い、Activityから戻ったときにもON/OFFを引き継ぐ。
  toggleEffects();
  effects.addEventListener("change", toggleEffects, { signal });

  function refreshGlitch() {
    // 入力欄の文字とキャレットを、実際のフォームのクリック位置に保つ。
    const { sizes, offsets } = glitch;
    const padding = 2 / renderer.screen.height;
    let start = 0;
    for (let index = 0; index < sizes.length; index += 1) {
      const end = start + sizes[index];
      const protectedBand = protectedRanges.some(
        (range) => end > range.start - padding && start < range.end + padding,
      );
      offsets[index] =
        protectedBand || Math.random() < 0.4
          ? 0
          : (Math.random() < 0.5 ? -1 : 1) * (0.6 + Math.random() * 0.4);
      start = end;
    }
    glitch.redraw();
  }

  function resize() {
    const { clientWidth: width, clientHeight: height } = host;
    renderer.resize(width, height, devicePixelRatio);
    const bounds = form.getBoundingClientRect();
    protectedRanges = Array.from(form.querySelectorAll("input, textarea, button"), (field) => {
      const rect = field.getBoundingClientRect();
      return {
        start: (rect.top - bounds.top) / bounds.height,
        end: (rect.bottom - bounds.top) / bounds.height,
      };
    });
    refreshGlitch();
  }

  const capture = pixiTexture(canvas, signal, () => {
    // 同じCanvasを更新するので、TextureとSpriteは初期化時のものを使い続ける。
    sprite.setSize(renderer.screen.width, renderer.screen.height);
    cached.updateCacheTexture();
    // 最初のフォームも描画し終えてから、Canvasを表示して準備完了を知らせる。
    render();
    renderer.canvas.style.visibility = "visible";
    gsap.ticker.add(tick);
  });
  sprite.texture = capture.texture;
  observeSize(
    host,
    () => {
      // Canvasのリサイズは画像を消すため、HTMLのpaintが済むまでGPU描画を止める。
      gsap.ticker.remove(tick);
      resize();
      capture.refresh();
    },
    signal,
  );

  function pulse() {
    burstEnd = Math.max(burstEnd, time + 0.16);
  }

  function tick(now: number) {
    time = now - started;
    if (!crt.enabled) {
      // OFF時はフィルターの更新も止め、入力とキャレットだけを描画する。
      render();
      return;
    }
    if (time >= nextBurst) {
      burstEnd = time + 0.24 + Math.random() * 0.12;
      nextBurst = time + 0.8 + Math.random() * 0.8;
    }
    const strength = time < burstEnd ? 1 : 0;
    // CRTは毎フレーム描き、グリッチの横ずれと色ずれだけを30fpsで更新する。
    const frame = Math.floor(time * 30);
    if (frame !== glitchFrame) {
      glitchFrame = frame;
      glitch.offset = strength
        ? Math.min(renderer.screen.width * 0.18, 160) * (0.6 + Math.random() * 0.4)
        : 4;
      refreshGlitch();
      // 色ずれはGlitchFilter内で処理し、全画面フィルターの重ね掛けを減らす。
      const split = 2.8 + strength * 8;
      glitch.red.x = split;
      glitch.blue.x = -split;
      glitch.red.y = 0.6 + strength * 2;
      glitch.blue.y = 0.6 - strength * 1.6;
    }
    crt.time = time * 8;
    crt.seed = Math.random();
    crt.noise = 0.04 + strength * 0.04;
    const glow = 0.32 + strength * 0.16;
    if (bloom.bloomScale !== glow) {
      bloom.bloomScale = glow;
      cached.updateCacheTexture();
    }
    render();
    // フィルターが借りた画像を描画後に外し、リサイズ時のプール破棄に参照を残さない。
    crt.groups[0].setResource(Texture.EMPTY.source, 1);
    crt.groups[0].setResource(Texture.EMPTY.source.style, 2);
    bloom.resources.uMapTexture = Texture.EMPTY.source;
  }

  form.addEventListener("input", pulse, { signal });
  form.addEventListener("submit", pulse, { signal });
  onCleanup(signal, () => {
    gsap.ticker.remove(tick);
    // 全filterが借りるgroupを、描画基盤の入力画像・uniformより先に解放する。
    crt.groups[0].destroy();
    // GlitchFilterのテクスチャより先に、親クラスのシェーダーを破棄する。
    Filter.prototype.destroy.call(glitch);
    for (const filter of filters) filter.destroy();
  });
  // フォームを描画してから、画面を切り替える準備完了を知らせる。
  await capture.painted;
  signal.throwIfAborted();
}
