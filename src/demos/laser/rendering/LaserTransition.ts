import { Container, Sprite, Texture } from "pixi.js";
import { HTMLSource } from "pixi.js/html-source";
import { createPixi } from "../../../shared/rendering/pixi";
import { observeSize } from "../../../shared/rendering/resize";
import { createLaserScene } from "./LaserScene";
import { createLightTexture } from "./lightTexture";
import { createPageCapture } from "../../../shared/rendering/pageCapture";

/** HTMLの切断と次ページの表示を、PixiJSのWebGPUで描画する。 */
export async function createLaserTransition(
  container: HTMLElement,
  canvases: HTMLCanvasElement[],
  initial: number,
  onStart: () => void,
  onComplete: (page: number) => void,
) {
  const { renderer, stage, render } = await createPixi(container);
  const [light, warmLight] = await Promise.all([
    createLightTexture("blue"),
    createLightTexture("orange"),
  ]);
  const laser = createLaserScene(light, warmLight);
  const incoming = new Container({ visible: false });
  const picture = incoming.addChild(new Sprite({ anchor: 0.5 }));
  stage.addChild(laser.view, incoming);
  let current = initial;
  let requested = initial;
  let running = false;
  const layout = createPageCapture(canvases);
  layout.resize(container.clientWidth, container.clientHeight);
  // 元HTMLをPixiJSの標準HTMLSourceから、直接GPUへ渡す。
  const captures = canvases.map((owner) => {
    const source = owner.firstElementChild as HTMLElement;
    renderer.canvas.append(source);
    return new Texture({ source: new HTMLSource({ resource: source }), dynamic: true });
  });
  const painted = Promise.withResolvers<void>();
  renderer.canvas.addEventListener("paint", () => {
    render();
    painted.resolve();
  });

  function transitionTo(page: number) {
    requested = page;
    if (running || page === current) return;
    running = true;
    incoming.visible = false;
    const animation = laser.cut(captures[current]);
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
    // スクロール位置をHTMLへ反映し、更新後の画面を再描画する。
    captures[page].source.requestPaint();
  }

  observeSize(container, resize);
  await painted.promise;
  return { transitionTo, scrollTo };
}
