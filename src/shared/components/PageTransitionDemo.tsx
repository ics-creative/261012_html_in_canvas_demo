import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useCanvasScene } from "../hooks/useCanvasScene";
import { Navigate, useLocation } from "react-router";
import { HtmlTexture } from "./HtmlTexture";
import { TransitionPage } from "./TransitionPage";
import { pages, laserPages } from "../data/pageCatalogs";
import "../styles/capture.css";
import "../styles/page-transition.css";

type Effect = "tiles" | "laser";

function TransitionViewport({
  page,
  effect,
  basePath,
}: {
  page: number;
  effect: Effect;
  basePath: string;
}) {
  const laser = effect === "laser";
  const catalog = laser ? laserPages : pages;
  const stage = useRef<HTMLElement>(null);
  const document = useRef<HTMLDivElement>(null);
  const [displayed, setDisplayed] = useState(page);
  const [animating, setAnimating] = useState(false);

  const [host, engine] = useCanvasScene(async (element) => {
    // レーザーではPixiJS、タイルではThree.jsだけを読み込む。
    const createTransition =
      effect === "laser"
        ? (await import("../../demos/laser/rendering/LaserTransition")).createLaserTransition
        : (await import("../../demos/transition/rendering/TiledTransition")).createTiledTransition;
    const instance = await createTransition(
      element,
      Array.from(stage.current!.querySelectorAll<HTMLCanvasElement>(".capture-staging canvas")),
      page,
      () => setAnimating(true),
      (index) => {
        // 次の誌面とスクロールの先頭を同じフレームに揃えてHTMLへ戻す。
        const viewport = document.current!;
        viewport.scrollTop = 0;
        flushSync(() => {
          setDisplayed(index);
          setAnimating(false);
        });
        // Canvasで出現済みのMVを、元HTMLの完了位置へ合わせる。
        for (const heading of viewport.querySelectorAll(".page-copy h2")) {
          for (const animation of heading.getAnimations({ subtree: true })) animation.finish();
        }
      },
    );
    // 初期化中にスクロールした場合も、最初の演出へ現在の表示位置を渡す。
    instance.scrollTo(page, document.current!.scrollTop);
    return instance;
  });

  useEffect(() => {
    engine?.transitionTo(page);
  }, [page, engine]);

  return (
    <main
      ref={stage}
      className={`experiment transition-stage ${engine ? "has-scene" : ""} ${animating ? "is-transitioning" : ""}`}
    >
      <div className="transition-host" ref={host}></div>
      <div
        ref={document}
        className="transition-document scrollable"
        inert={animating}
        onScroll={(event) => engine?.scrollTo(displayed, event.currentTarget.scrollTop)}
      >
        <TransitionPage page={displayed} basePath={basePath} laser={laser} />
      </div>
      {catalog.map(({ id }, index) => (
        <HtmlTexture key={id}>
          <div className="capture-page">
            <TransitionPage page={index} basePath={basePath} laser={laser} />
          </div>
        </HtmlTexture>
      ))}
    </main>
  );
}

/** URLに対応したHTMLページをレーザーまたはタイルで切り替える。 */
export default function PageTransitionDemo({ effect = "tiles" }: { effect?: Effect }) {
  const id = useLocation().pathname.split("/")[2];
  const catalog = effect === "laser" ? laserPages : pages;
  const page = catalog.findIndex((item) => item.id === id);
  const basePath = effect === "laser" ? "/laser" : "/transition";
  if (page < 0) return <Navigate to={`${basePath}/01`} replace />;
  return <TransitionViewport page={page} effect={effect} basePath={basePath} />;
}
