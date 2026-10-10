import { createContext, createRef, type Ref } from "react";
import { NavLink } from "react-router";
import "./glass.css";

/** 共通ツールバーの寸法を、各方式の屈折処理へ渡す。 */
export const GlassControlsContext = createContext(createRef<HTMLElement>());

/** 3方式の切り替え中も同じツールバーを保ち、選択背景を横へ動かす。 */
export function GlassControls({ ref, css }: { ref: Ref<HTMLElement>; css: boolean }) {
  return (
    <nav ref={ref} className={`glass-controls${css ? " glass-controls-css" : ""}`}>
      {/* レイヤー・画面・曲線のアイコンで各描画方式を区別する。 */}
      <NavLink to="/glass-css" style={{ anchorName: "--glass-css" }}>
        <svg viewBox="0 0 24 24">
          <path d="m12 4 8 4-8 4-8-4Zm-8 8 8 4 8-4M4 16l8 4 8-4" />
        </svg>
        <span>CSS</span>
      </NavLink>
      <NavLink to="/glass" end style={{ anchorName: "--glass-html" }}>
        <svg viewBox="0 0 24 24">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="m4 16 6-6 4 4 4-2 2 4" />
        </svg>
        <span>HTML in Canvas</span>
      </NavLink>
      <NavLink to="/glass-svg" style={{ anchorName: "--glass-svg" }}>
        <svg viewBox="0 0 24 24">
          <path d="M4 18C4 4 20 20 20 6" />
          <rect x="2" y="16" width="4" height="4" rx="2" />
          <rect x="18" y="4" width="4" height="4" rx="2" />
        </svg>
        <span>SVG</span>
      </NavLink>
    </nav>
  );
}
