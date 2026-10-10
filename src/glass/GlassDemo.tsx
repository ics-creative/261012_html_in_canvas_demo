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

/** 同じ写真一覧でCSS blur・HTML in Canvas・SVGの3方式を比較する。 */
export function GlassDemo({ method = "html" }: { method?: "css" | "html" | "svg" }) {
  const html = method === "html";
  const canvas = useRef<HitCanvas>(null);
  const page = useRef<HTMLElement>(null);
  const controls = useRef<HTMLElement>(null);
  const [host] = useCanvasScene(async (element, signal, ready) => {
    await ready;
    signal.throwIfAborted();
    // CSS版は通常のDOMとbackdrop-filterだけで表示し、GPUを初期化しない。
    if (method === "css") return;
    if (!canvas.current || !page.current || !controls.current) {
      throw new Error("ガラスの描画要素がありません。");
    }
    return createGlassScene(
      element,
      canvas.current,
      page.current,
      controls.current,
      signal,
      method === "svg",
    );
  });

  return (
    <main className="experiment">
      <section ref={host} className={`glass-stage glass-${method}`}>
        {!html && <Gallery ref={page} />}
        {method !== "css" && (
          <canvas ref={canvas} {...(html ? { content: "drawable" } : {})}>
            {/* 表示と操作の元になる同じHTMLを、端末の解像度で描く。 */}
            {html && (
              <div className="glass-document" {...{ drawable: "" }}>
                <Gallery ref={page} zoom={devicePixelRatio} />
              </div>
            )}
          </canvas>
        )}
        {/* 一覧の主ツールバー全体をガラスにし、写真が縁で曲がる位置へ重ねる。 */}
        <nav ref={controls} className="glass-controls">
          <div>
            <h2>Photo Library</h2>
            <p>{gallery.length} photographs</p>
          </div>
          {/* 見た目と画像化方式を一つの選択へまとめ、組み合わせの操作をなくす。 */}
          <div className="glass-methods">
            <NavLink to="/glass-css">CSS blur</NavLink>
            <NavLink to="/glass" end>
              HTML in Canvas
            </NavLink>
            <NavLink to="/glass-svg">SVG foreignObject</NavLink>
          </div>
        </nav>
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
