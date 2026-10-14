import { lazy } from "react";
import { NavLink, Navigate, Route, useLocation } from "react-router";
import { DemoViewport } from "./DemoViewport";
import "./app.css";
import "./scrollbar.css";

// デモごとのJSを遅延読み込みし、Three.jsとPixiJSは使用する画面で読み込む。
const CanvasStage = lazy(() => import("../canvas/CanvasStage"));
const TransitionDemo = lazy(() => import("../transition/TransitionDemo"));
const CRTDemo = lazy(() => import("../crt/CRTDemo"));
const RetroDemo = lazy(() => import("../crt/RetroDemo"));
const DistortionDemo = lazy(() => import("../distortion/DistortionDemo"));
const BookDemo = lazy(() => import("../book/BookDemo"));
const GlassDemo = lazy(() => import("../glass/GlassDemo"));

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
  const { pathname } = useLocation();
  const demo = pathname.startsWith("/glass") ? "glass" : pathname.split("/")[1];

  return (
    <>
      <header className="header">
        <h1>HTML in Canvas</h1>
        <nav style={{ positionAnchor: `--demo-${demo}` }}>
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
        {/* 初期表示を01のTransitionsへ揃える。 */}
        <Route path="*" element={<Navigate to="/transition/01" replace />} />
      </DemoViewport>
    </>
  );
}
