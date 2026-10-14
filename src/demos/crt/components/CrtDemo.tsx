import { useRef, useState } from "react";
import { useCanvasScene } from "../../../shared/hooks/useCanvasScene";
import { createCrtDisplay } from "../rendering/CrtDisplay";
import { NoteFields } from "../../../shared/components/NoteFields";
import "../styles/crt.css";

/** HTMLフォームをPixiJSのCRT・グリッチフィルターで描画する。 */
export default function CrtDemo() {
  const inputCanvas = useRef<HTMLCanvasElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const effects = useRef<HTMLInputElement>(null);
  const [received, setReceived] = useState(false);

  const [output] = useCanvasScene((host) =>
    createCrtDisplay(host, inputCanvas.current!, form.current!, effects.current!),
  );

  return (
    <main className="experiment crt-stage">
      {/* フィルターの外に置き、強いグリッチ中も切り替えを操作できるようにする。 */}
      <label className="crt-toggle">
        Effects
        <input ref={effects} type="checkbox" defaultChecked />
      </label>
      <div className="crt-screen">
        {/* 子HTMLのレイアウトを有効にし、2DのCanvasへフォームを描く。 */}
        <canvas
          ref={inputCanvas}
          className="crt-input"
          {...{ content: "drawable", layoutsubtree: "" }}
        >
          <form
            ref={form}
            className="crt-form"
            {...{ drawable: "" }}
            onInput={() => setReceived(false)}
            onSubmit={(event) => {
              event.preventDefault();
              setReceived(true);
            }}
          >
            <h2>POSTCARD</h2>
            <NoteFields />
            <div className="crt-submit">
              <button type="submit">
                Save postcard <span>↗</span>
              </button>
              <output>{received ? "Postcard saved." : ""}</output>
            </div>
          </form>
        </canvas>
        <div ref={output} className="crt-output"></div>
        <div className="crt-glass"></div>
      </div>
    </main>
  );
}
