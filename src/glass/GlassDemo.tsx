import { useRef, type Ref } from "react";
import { NavLink } from "react-router";
import { useCanvasScene } from "../canvas/useCanvasScene";
import type { HitCanvas } from "../canvas/HTMLHitTarget";
import { createGlassScene } from "./GlassScene";
import "./glass.css";

// 指定されたJPEG XLを写真一覧へ使う。
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

// 同じ8点を4周並べ、縦スクロール中の屈折を見せる。
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
    // CSS版は通常のDOMとbackdrop-filterで描く。
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
        {/* 3方式を等幅のセグメントに並べ、写真が屈折する位置へ重ねる。 */}
        <nav ref={controls} className="glass-controls">
          {/* レイヤー・画面・曲線のアイコンで各描画方式を区別する。 */}
          <NavLink to="/glass-css">
            <svg viewBox="0 0 24 24">
              <path d="m12 4 8 4-8 4-8-4Zm-8 8 8 4 8-4M4 16l8 4 8-4" />
            </svg>
            <span>CSS blur</span>
          </NavLink>
          <NavLink to="/glass" end>
            <svg viewBox="0 0 24 24">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m4 16 6-6 4 4 4-2 2 4" />
            </svg>
            <span>HTML in Canvas</span>
          </NavLink>
          <NavLink to="/glass-svg">
            <svg viewBox="0 0 24 24">
              <path d="M4 18C4 4 20 20 20 6" />
              <rect x="2" y="16" width="4" height="4" rx="2" />
              <rect x="18" y="4" width="4" height="4" rx="2" />
            </svg>
            <span>SVG foreignObject</span>
          </NavLink>
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
