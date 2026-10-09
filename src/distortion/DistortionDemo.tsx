import { useRef, useState } from "react";
import { PageNavigation } from "../app/Navigation";
import { useCanvasScene } from "../canvas/useCanvasScene";
import { flushSync } from "react-dom";
import { HTMLTexture } from "../canvas/HTMLTexture";
import { createDistortionScene, width, height } from "./DistortionScene";
import "../canvas/canvas.css";
import "./distortion.css";

const pages = [
  {
    title: "GALLERY",
    image: "images/photos/BF_06888.jxl",
    description: "Tall windows, chandeliers and reflected light along a crowded gallery.",
  },
  {
    title: "DOME",
    image: "images/photos/P3171108.jxl",
    description: "Coloured glass and curved balconies beneath an ornate domed roof.",
  },
  {
    title: "RIVER",
    image: "images/photos/P3335279.jxl",
    description: "The Eiffel Tower, riverside lights and a violet sky reflected in the Seine.",
  },
];

function TextPage({ index, inert = false }: { index: number; inert?: boolean }) {
  return (
    <section className="distortion-type" inert={inert}>
      <header>
        <span>0{index + 1} / 03</span>
      </header>
      <div className="distortion-copy">
        <h2>{pages[index].title}</h2>
        <p>{pages[index].description}</p>
      </div>
    </section>
  );
}

/** HTMLの背景と文字を、時間差のある風の歪みで切り替えるデモ。 */
export function DistortionDemo() {
  const stage = useRef<HTMLElement>(null);
  const [current, setCurrent] = useState(0);
  const [scale, setScale] = useState(1);
  const [animating, setAnimating] = useState(false);

  const [host, scene] = useCanvasScene(async (element, signal, ready) => {
    await ready;
    signal.throwIfAborted();
    return createDistortionScene(
      element,
      Array.from(stage.current!.querySelectorAll<HTMLCanvasElement>(".capture-staging canvas")),
      signal,
      setScale,
      () => flushSync(() => setAnimating(true)),
      (index) => {
        // GPUの最終描画後、同じフレーム内で元HTMLへ戻す。
        flushSync(() => {
          setCurrent(index);
          setAnimating(false);
        });
      },
    );
  });

  const go = (step: -1 | 1) => {
    if (!scene) return;
    scene.go(step);
  };

  return (
    <main className="experiment">
      <section ref={stage} className="canvas-stage distortion-stage">
        <div ref={host} className="distortion-host" />
        <div
          className={`distortion-document ${animating ? "is-transitioning" : ""}`}
          style={{
            transform: `translate(-50%, -50%) scale(${scale})`,
          }}
        >
          <TextPage index={current} inert={animating} />
        </div>
        <PageNavigation
          className="distortion-navigation"
          disabled={() => !scene || animating}
          onGo={go}
        />
        {pages.map((page, index) => (
          <div key={index}>
            <HTMLTexture width={width} height={height}>
              {/* 歪ませる写真をHTMLとして配置する。 */}
              <div className="distortion-art">
                <img src={page.image} alt="" />
              </div>
            </HTMLTexture>
            <HTMLTexture width={width} height={height}>
              <TextPage index={index} />
            </HTMLTexture>
          </div>
        ))}
      </section>
    </main>
  );
}
