import { lazy } from "react";
import { NavLink, Navigate, Route } from "react-router";
import { DemoViewport } from "./DemoViewport";
import "./app.css";
import "./scrollbar.css";

// 表示するデモだけを読み込み、Three.jsとPixiJSを初回の共通JSへまとめない。
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

const demos = [
  ["01", "transition", "Transitions"],
  ["02", "laser", "Laser"],
  ["03", "distortion", "Distortion"],
  ["04", "cloth", "Cloth"],
  ["05", "book", "Book"],
  ["06", "crt", "CRT"],
  ["07", "crt-3d", "CRT 3D"],
  ["08", "glass", "Glass"],
];

/** デモごとのURLと共通ナビゲーションを定義する。 */
export function App() {
  return (
    <>
      <header className="header">
        <h1>HTML in Canvas</h1>
        <nav>
          {demos.map(([number, id, label]) => (
            <NavLink key={id} to={`/${id}`} style={{ anchorName: `--demo-${id}` }}>
              <span>{number}</span> {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <DemoViewport>
        <Route path="/transition/:page?" element={<TransitionDemo />} />
        <Route path="/laser/:page?" element={<TransitionDemo effect="laser" />} />
        <Route path="/distortion" element={<DistortionDemo />} />
        <Route path="/cloth" element={<CanvasStage />} />
        <Route path="/book" element={<BookDemo />} />
        <Route path="/crt" element={<CRTDemo />} />
        <Route path="/crt-3d" element={<RetroDemo />} />
        <Route path="/glass" element={<GlassDemo />} />
        <Route path="/glass-css" element={<GlassDemo method="css" />} />
        <Route path="/glass-svg" element={<GlassDemo method="svg" />} />
        <Route path="*" element={<Navigate to="/cloth" replace />} />
      </DemoViewport>
    </>
  );
}
