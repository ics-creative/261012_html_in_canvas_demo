import { useRef, type Ref } from "react";
import { NavLink } from "react-router";
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

/** 同じ写真一覧をHTML in CanvasまたはSVG経由で屈折させる。 */
export function GlassDemo({ svg = false }: { svg?: boolean }) {
  const canvas = useRef<HitCanvas>(null);
  const page = useRef<HTMLElement>(null);
  const controls = useRef<HTMLFormElement>(null);
  const [host] = useCanvasScene(async (element, signal, ready) => {
    await ready;
    signal.throwIfAborted();
    if (!canvas.current || !page.current || !controls.current) {
      throw new Error("ガラスの描画要素がありません。");
    }
    return createGlassScene(element, canvas.current, page.current, controls.current, signal, svg);
  });

  return (
    <main className="experiment">
      <section ref={host} className={`glass-stage ${svg ? "glass-svg" : ""}`}>
        {svg && <Gallery ref={page} />}
        <canvas ref={canvas} {...(svg ? {} : { content: "drawable" })}>
          {/* 表示と操作の元になる同じHTMLを、端末の解像度で描く。 */}
          {!svg && (
            <div className="glass-document" {...{ drawable: "" }}>
              <Gallery ref={page} zoom={devicePixelRatio} />
            </div>
          )}
        </canvas>
        {/* 一覧の主ツールバー全体をガラスにし、写真が縁で曲がる位置へ重ねる。 */}
        <form ref={controls} className="glass-controls">
          <div>
            <h2>Photo Library</h2>
            <p>{gallery.length} photographs</p>
          </div>
          <div>
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
            <nav className="glass-sources">
              <NavLink to="/glass" end>
                HTML in Canvas
              </NavLink>
              <NavLink to="/glass-svg">SVG foreignObject</NavLink>
            </nav>
          </div>
        </form>
      </section>
    </main>
  );
}

function Gallery({ ref, zoom = 1 }: { ref: Ref<HTMLElement>; zoom?: number }) {
  return (
    <article ref={ref} className="glass-page" style={{ zoom }}>
      {/* スクロールと文字選択は元HTMLへ任せ、画像化はガラスの背面だけに使う。 */}
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
  );
}
