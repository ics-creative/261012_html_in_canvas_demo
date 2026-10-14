import { createContext, createRef, type Ref } from "react";
import cssLogo from "./css.svg?no-inline";
import "./glass.css";

/** 共通ツールバーの寸法を、各方式の屈折処理へ渡す。 */
export const GlassControlsContext = createContext(createRef<HTMLElement>());

/** 描画方式の文書へ移動するツールバーを配置する。 */
export function GlassControls({ ref, route }: { ref: Ref<HTMLElement>; route: string }) {
  return (
    <nav
      ref={ref}
      className={`glass-controls${route === "glass-css" ? " glass-controls-css" : ""}`}
    >
      {/* CSSの公式ロゴと、写真・ペン先のアイコンで描画方式を区別する。 */}
      <a
        href={route === "glass-css" ? "#/glass-css" : "?demo=glass-css#/glass-css"}
        className={route === "glass-css" ? "active" : undefined}
        style={{ anchorName: "--glass-css" }}
      >
        <svg viewBox="0 0 1000 1000">
          <use href={`${cssLogo}#bg`} />
          <use href={`${cssLogo}#fg`} />
        </svg>
        <span>CSS</span>
      </a>
      <a
        href={route === "glass" ? "#/glass" : "?demo=glass#/glass"}
        className={route === "glass" ? "active" : undefined}
      >
        <svg viewBox="0 0 24 24">
          <path
            fillRule="evenodd"
            d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2ZM6 8a2 2 0 1 0 4 0 2 2 0 1 0-4 0ZM4 16h16l-4-4-4 2-4-4Z"
          />
        </svg>
        <span>
          <span className="canvas-prefix">HTML in </span>Canvas
        </span>
      </a>
      <a
        href={route === "glass-svg" ? "#/glass-svg" : "?demo=glass-svg#/glass-svg"}
        className={route === "glass-svg" ? "active" : undefined}
      >
        <svg viewBox="0 0 24 24">
          <path
            fillRule="evenodd"
            d="M16 2l6 6-2 2-6-6ZM12 6l6 6-4 8-12 2 2-12Zm-6 10a2 2 0 1 0 4 0 2 2 0 1 0-4 0Z"
          />
        </svg>
        <span>SVG</span>
      </a>
    </nav>
  );
}
