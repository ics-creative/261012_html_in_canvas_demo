import { Container, Sprite, Texture } from "pixi.js";
import { HTMLSource } from "pixi.js/html-source";
import { createPixi } from "../pixi";
import { onCleanup } from "../lifecycle";
import { observeSize } from "../resize";
import { createLaserScene } from "./LaserScene";
import { createLightTexture } from "./lightTexture";
import { createPageCapture } from "../../transition/pageCapture";

/** HTMLの切断と次ページの表示を、PixiJSのWebGPUで描画する。 */
export async function createLaserTransition(
  container: HTMLElement,
  canvases: HTMLCanvasElement[],
  signal: AbortSignal,
  initial: number,
  onStart: () => void,
  onComplete: (page: number) => void,
) {
  const { renderer, stage, render } = await createPixi(container, signal);
  const [light, warmLight] = await Promise.all([
    createLightTexture("blue"),
    createLightTexture("orange"),
  ]);
  onCleanup(signal, () => {
    queueMicrotask(() => {
      light.destroy(true);
      warmLight.destroy(true);
    });
  });
  signal.throwIfAborted();
  const view = stage.addChild(new Container());
  const laser = createLaserScene(light, warmLight);
  const incoming = new Container({ visible: false });
  const picture = incoming.addChild(new Sprite({ anchor: 0.5 }));
  view.addChild(laser.view, incoming);
  let current = initial;
  let requested = initial;
  let running = false;
  const layout = createPageCapture(canvases);
  layout.resize(container.clientWidth, container.clientHeight);
  // 2D Canvasへ複写せず、元HTMLをPixiJSの標準HTMLSourceで直接GPUへ渡す。
  const captures = canvases.map((owner) => {
    const source = owner.firstElementChild as HTMLElement;
    renderer.canvas.append(source);
    const texture = new Texture({ source: new HTMLSource({ resource: source }), dynamic: true });
    onCleanup(signal, () => {
      owner.append(source);
      queueMicrotask(() => texture.destroy(true));
    });
    return texture;
  });
  const painted = Promise.withResolvers<void>();
  renderer.canvas.addEventListener(
    "paint",
    () => {
      render();
      painted.resolve();
    },
    { signal },
  );
  onCleanup(signal, painted.resolve);

  function transitionTo(page: number) {
    requested = page;
    if (running || page === current) return;
    running = true;
    incoming.visible = false;
    const angle = Math.random() * Math.PI * 2;
    const animation = laser.cut(captures[current], (strength) => {
      // 2Dの視点を連射全体で3回だけ押し戻し、一発ごとの細かな振動を避ける。
      const at = animation.time();
      animation
        .to(
          view,
          {
            x: -Math.cos(angle) * strength,
            y: -Math.sin(angle) * strength,
            rotation: Math.cos(angle) * strength * 0.0004,
            duration: 0.04,
            ease: "power4.out",
          },
          at,
        )
        .to(view, { x: 0, y: 0, rotation: 0, duration: 0.24, ease: "expo.out" }, at + 0.04);
    });
    animation
      .call(() => {
        current = requested;
        scrollTo(current, 0);
        picture.texture = captures[current];
        picture.setSize(container.clientWidth, container.clientHeight);
        incoming.visible = true;
        incoming.alpha = 0;
        incoming.scale.set(0.96);
      })
      .to(incoming, { alpha: 1, duration: 0.8, ease: "none" })
      .to(incoming.scale, { x: 1, y: 1, duration: 0.8, ease: "expo.out" }, "<")
      .eventCallback("onUpdate", render)
      .eventCallback("onComplete", () => {
        running = false;
        onComplete(current);
        transitionTo(requested);
      });
    // 元HTMLを隠す前に、切断開始時の誌面を描画しておく。
    render();
    onStart();
    animation.play(0);
  }

  function resize() {
    const { clientWidth: width, clientHeight: height } = container;
    layout.resize(width, height);
    renderer.resize(width, height);
    stage.position.set(width / 2, height / 2);
    if (running) laser.resize(width, height);
    picture.setSize(width, height);
    captures[0].source.requestPaint();
    render();
  }

  function scrollTo(page: number, top: number) {
    layout.scrollTo(page, top);
    // スクロールでは描画だけを更新し、Canvasの寸法を毎回作り直さない。
    captures[page].source.requestPaint();
  }

  observeSize(container, resize, signal);
  onCleanup(signal, laser.dispose);
  await painted.promise;
  return { transitionTo, scrollTo };
}
