import { useRef, useState } from "react";
import { useCanvasScene } from "../canvas/useCanvasScene";
import { createCRTDisplay } from "./CRTDisplay";
import "./crt.css";

/** HTMLフォームをPixiJSのCRT・グリッチフィルターで描画する。 */
export function CRTDemo() {
  const inputCanvas = useRef<HTMLCanvasElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const effects = useRef<HTMLInputElement>(null);
  const [received, setReceived] = useState(false);

  const [output] = useCanvasScene(async (host, signal, ready) => {
    await ready;
    signal.throwIfAborted();
    return createCRTDisplay(host, inputCanvas.current!, form.current!, effects.current!, signal);
  });

  return (
    <main className="experiment">
      <section className="crt-stage">
        {/* フィルターの外に置き、強いグリッチ中も切り替えを操作できるようにする。 */}
        <label className="crt-toggle">
          Effects
          <input ref={effects} type="checkbox" defaultChecked />
        </label>
        <div className="crt-screen">
          {/* Three/PixiのHTMLテクスチャと同じ描画属性を、2DのCanvasにも設定する。 */}
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
              <div className="crt-fields">
                {[
                  ["Name", "name", "Your name"],
                  ["Email", "email", "you@example.com"],
                ].map(([label, name, placeholder]) => (
                  <label key={name}>
                    {label}
                    <input
                      name={name}
                      type={name === "email" ? "email" : "text"}
                      autoComplete={name}
                      required
                      placeholder={placeholder}
                    />
                  </label>
                ))}
              </div>
              <label className="crt-message">
                Travel notes
                <textarea name="message" required placeholder="Write a note from your trip." />
              </label>
              <div className="crt-submit">
                <button type="submit">
                  Save postcard <span>↗</span>
                </button>
                <output>{received ? "Postcard saved." : ""}</output>
              </div>
            </form>
          </canvas>
          <div ref={output} className="crt-output" />
          <div className="crt-glass" />
        </div>
      </section>
    </main>
  );
}
