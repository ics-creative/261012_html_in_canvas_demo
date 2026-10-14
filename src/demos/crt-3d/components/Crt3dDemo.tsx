import { useRef } from "react";
import { useCanvasScene } from "../../../shared/hooks/useCanvasScene";
import type { HitCanvas } from "../../../shared/rendering/HtmlHitTarget";
import { createCrt3dScene } from "../rendering/Crt3dScene";
import { Crt3dDesktop } from "./Crt3dDesktop";
import "../styles/crt-3d.css";

/** Three.jsのWebGPUだけで、入力できるHTML画面とiMac風の筐体を描く。 */
export default function Crt3dDemo() {
  const pixelRatio = devicePixelRatio;
  const canvas = useRef<HitCanvas>(null);
  const [host] = useCanvasScene((element) => createCrt3dScene(element, canvas.current!));

  return (
    <main className="experiment retro-stage">
      <div ref={host} className="retro-host">
        {/* 元HTMLを端末の解像度で描き、曲面でも入力と文字の鮮明さを保つ。 */}
        <canvas ref={canvas} {...{ content: "drawable" }}>
          <div
            className="retro-document"
            style={{ width: 800 * pixelRatio, height: 600 * pixelRatio }}
            {...{ drawable: "" }}
          >
            <Crt3dDesktop pixelRatio={pixelRatio} />
          </div>
        </canvas>
      </div>
    </main>
  );
}
