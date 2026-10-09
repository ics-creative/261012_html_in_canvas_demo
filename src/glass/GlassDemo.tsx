import { useRef } from "react";
import { useCanvasScene } from "../canvas/useCanvasScene";
import type { HitCanvas } from "../canvas/HTMLHitTarget";
import { createGlassScene } from "./GlassScene";
import "./glass.css";

// 指定されたJPEG XLを、変換せず写真一覧へ使う。
const photos = [
  { file: "P3335279", title: "Seine at dusk", caption: "Paris / River" },
  { file: "BF_06888", title: "Palace gallery", caption: "France / Interiors" },
  { file: "P3171108", title: "Glass dome", caption: "Paris / Architecture" },
  { file: "P3171064", title: "Street market", caption: "Paris / Streets" },
  { file: "P3171021", title: "Above the rooftops", caption: "Paris / City" },
  { file: "BF_06794", title: "Formal gardens", caption: "France / Gardens" },
  { file: "P3233004", title: "Mont Saint-Michel", caption: "Normandy / Coast" },
  { file: "P3304136", title: "Stone facade", caption: "Paris / Architecture" },
];

// 同じ8点を4周並べ、素材を増やさず縦スクロール中の屈折を見せる。
const gallery = Array.from({ length: 4 }, () => photos).flat();

/** 写真一覧の主ツールバーをガラスで描き、CSSのぼかしと比較する。 */
export function GlassDemo() {
  const canvas = useRef<HitCanvas>(null);
  const controls = useRef<HTMLFormElement>(null);
  const [host] = useCanvasScene(async (element, signal, ready) => {
    await ready;
    signal.throwIfAborted();
    if (!canvas.current || !controls.current) throw new Error("ガラスの描画要素がありません。");
    return createGlassScene(element, canvas.current, controls.current, signal);
  });

  return (
    <main className="experiment">
      <section ref={host} className="glass-stage">
        <canvas ref={canvas} {...{ content: "drawable" }}>
          {/* 表示と操作の元になる同じHTMLを、端末の解像度で描く。 */}
          <div className="glass-document" {...{ drawable: "" }}>
            <article className="glass-page" style={{ zoom: devicePixelRatio }}>
              {/* 一覧のスクロールと文字選択は元HTMLの標準操作に任せる。 */}
              <ul className="glass-list scrollable">
                {gallery.map(({ file, title, caption }, index) => (
                  <li key={index}>
                    <img src={`images/photos/${file}.jxl`} alt="" />
                    <h3>{title}</h3>
                    <p>{caption}</p>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </canvas>
        {/* 一覧の主ツールバー全体をガラスにし、写真が縁で曲がる位置へ重ねる。 */}
        <form ref={controls} className="glass-controls">
          <div>
            <h2>Photo Library</h2>
            <p>{gallery.length} photographs</p>
          </div>
          <div className="glass-materials">
            <label>
              <input type="radio" name="material" value="glass" defaultChecked />
              Liquid Glass
            </label>
            <label>
              <input type="radio" name="material" value="css" />
              CSS blur
            </label>
          </div>
        </form>
      </section>
    </main>
  );
}
