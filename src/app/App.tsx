import { lazy } from "react";
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

// 文書を読み込んだ時点のデモを選び、誌面内のURLだけを更新する。
const requested = location.hash.split("/")[1] || "transition";
const method = requested === "glass-css" ? "css" : requested === "glass-svg" ? "svg" : "html";

// メニューの並び順から連番を付け、表示位置と番号を揃える。
const demos = [
  ["transition", "Transitions", <TransitionDemo />],
  ["laser", "Laser", <TransitionDemo effect="laser" />],
  ["cloth", "Cloth", <CanvasStage />],
  ["book", "Book", <BookDemo />],
  ["crt", "CRT", <CRTDemo />],
  ["distortion", "Distortion", <DistortionDemo />],
  ["crt-3d", "CRT 3D", <RetroDemo />],
  ["glass", "Glass", <GlassDemo method={method} />],
] as const;
const current =
  demos.find(([id]) => id === (requested.startsWith("glass") ? "glass" : requested)) || demos[0];
const route = current[0] === "glass" ? requested : current[0];
const currentPath = route === "transition" || route === "laser" ? `${route}/01` : route;

/** 文書ごとのデモと共通ナビゲーションを描く。 */
export function App() {
  return (
    <>
      <header className="header">
        <h1>HTML in Canvas</h1>
        <nav style={{ positionAnchor: `--demo-${current[0]}` }}>
          {demos.map(([id, label], index) => {
            const page = id === "transition" || id === "laser" ? `${id}/01` : id;
            return (
              <a
                key={id}
                href={id === current[0] ? `#/${currentPath}` : `?demo=${id}#/${page}`}
                style={{ anchorName: `--demo-${id}` }}
              >
                <span>{String(index + 1).padStart(2, "0")}</span> {label}
              </a>
            );
          })}
        </nav>
      </header>
      {/* 初期表示を01のTransitionsへ揃え、誌面内のページはHashRouterで進める。 */}
      <DemoViewport route={currentPath}>{current[2]}</DemoViewport>
    </>
  );
}
