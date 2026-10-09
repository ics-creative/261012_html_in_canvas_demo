import { useRef } from "react";
import { useCanvasScene } from "../canvas/useCanvasScene";
import type { HitCanvas } from "../canvas/HTMLHitTarget";
import { createRetroScene } from "./RetroScene";
import { RetroDesktop } from "./RetroDesktop";
import "./retro.css";

/** Three.jsのWebGPUだけで、入力できるHTML画面とiMac風の筐体を描く。 */
export function RetroDemo() {
  const pixelRatio = devicePixelRatio;
  const canvas = useRef<HitCanvas>(null);
  const [host] = useCanvasScene((element, signal, ready) => {
    if (!canvas.current) {
      throw new Error("CRTの描画要素が配置されていません。");
    }
    return createRetroScene(element, canvas.current, signal, ready);
  });

  return (
    <main className="experiment">
      <section className="retro-stage">
        <div ref={host} className="retro-host">
          {/* 元HTMLを端末の解像度で描き、曲面でも入力と文字の鮮明さを保つ。 */}
          <canvas ref={canvas} {...{ content: "drawable" }}>
            <div
              className="retro-document"
              style={{ width: 800 * pixelRatio, height: 600 * pixelRatio }}
              {...{ drawable: "" }}
            >
              <RetroDesktop pixelRatio={pixelRatio} />
            </div>
          </canvas>
        </div>
      </section>
    </main>
  );
}
