import { lazy } from "react";
import { DemoViewport } from "./DemoViewport";
import "../styles/app.css";
import "../styles/scrollbar.css";

// デモごとのJSを遅延読み込みし、Three.jsとPixiJSは使用する画面で読み込む。
const ClothDemo = lazy(() => import("../../demos/cloth/components/ClothDemo"));
const PageTransitionDemo = lazy(() => import("../../shared/components/PageTransitionDemo"));
const CrtDemo = lazy(() => import("../../demos/crt/components/CrtDemo"));
const Crt3dDemo = lazy(() => import("../../demos/crt-3d/components/Crt3dDemo"));
const DistortionDemo = lazy(() => import("../../demos/distortion/components/DistortionDemo"));
const BookDemo = lazy(() => import("../../demos/book/components/BookDemo"));
const GlassDemo = lazy(() => import("../../demos/glass/components/GlassDemo"));

// 文書を読み込んだ時点のデモを選び、誌面内のURLだけを更新する。
const requested = location.hash.split("/")[1] || "transition";
const method = requested === "glass-css" ? "css" : requested === "glass-svg" ? "svg" : "html";

// デモの変更は先に受けて文書を読み直し、誌面内のページ変更をHashRouterへ渡す。
window.addEventListener("popstate", (event) => {
  if ((location.hash.split("/")[1] || "transition") !== requested) {
    event.stopImmediatePropagation();
    location.reload();
  }
});

// メニューの並び順から連番を付け、表示位置と番号を揃える。
const demos = [
  ["transition", "Transitions", <PageTransitionDemo />],
  ["laser", "Laser", <PageTransitionDemo effect="laser" />],
  ["cloth", "Cloth", <ClothDemo />],
  ["book", "Book", <BookDemo />],
  ["crt", "CRT", <CrtDemo />],
  ["distortion", "Distortion", <DistortionDemo />],
  ["crt-3d", "CRT 3D", <Crt3dDemo />],
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
        <nav>
          {demos.map(([id, label], index) => {
            const page = id === "transition" || id === "laser" ? `${id}/01` : id;
            return (
              <a key={id} href={`#/${page}`} className={id === current[0] ? "active" : undefined}>
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
