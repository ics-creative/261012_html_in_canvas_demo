import { lazy } from "react";
import { NavLink, Navigate, Route } from "react-router";
import { DemoViewport } from "./DemoViewport";
import "./app.css";
import "./scrollbar.css";

// デモごとのJSを遅延読み込みし、Three.jsとPixiJSは使用する画面で読み込む。
const CanvasStage = lazy(async () => ({
  default: (await import("../canvas/CanvasStage")).CanvasStage,
}));
const TransitionDemo = lazy(async () => ({
  default: (await import("../transition/TransitionDemo")).TransitionDemo,
}));
const CRTDemo = lazy(async () => ({ default: (await import("../crt/CRTDemo")).CRTDemo }));
const RetroDemo = lazy(async () => ({ default: (await import("../crt/RetroDemo")).RetroDemo }));
const DistortionDemo = lazy(async () => ({
  default: (await import("../distortion/DistortionDemo")).DistortionDemo,
}));
const BookDemo = lazy(async () => ({ default: (await import("../book/BookDemo")).BookDemo }));
const GlassDemo = lazy(async () => ({ default: (await import("../glass/GlassDemo")).GlassDemo }));

// メニューの並び順から連番を付け、表示位置と番号を揃える。
const demos = [
  ["transition", "Transitions"],
  ["laser", "Laser"],
  ["cloth", "Cloth"],
  ["book", "Book"],
  ["crt", "CRT"],
  ["distortion", "Distortion"],
  ["crt-3d", "CRT 3D"],
  ["glass", "Glass"],
];

/** デモごとのURLと共通ナビゲーションを定義する。 */
export function App() {
  return (
    <>
      <header className="header">
        <h1>HTML in Canvas</h1>
        <nav>
          {demos.map(([id, label], index) => (
            <NavLink key={id} to={`/${id}`} style={{ anchorName: `--demo-${id}` }}>
              <span>{String(index + 1).padStart(2, "0")}</span> {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <DemoViewport>
        <Route path="/transition/:page?" element={<TransitionDemo />} />
        <Route path="/laser/:page?" element={<TransitionDemo effect="laser" />} />
        <Route path="/cloth" element={<CanvasStage />} />
        <Route path="/book" element={<BookDemo />} />
        <Route path="/crt" element={<CRTDemo />} />
        <Route path="/distortion" element={<DistortionDemo />} />
        <Route path="/crt-3d" element={<RetroDemo />} />
        <Route path="/glass" element={<GlassDemo />} />
        <Route path="/glass-css" element={<GlassDemo method="css" />} />
        <Route path="/glass-svg" element={<GlassDemo method="svg" />} />
        <Route path="*" element={<Navigate to="/cloth" replace />} />
      </DemoViewport>
    </>
  );
}
