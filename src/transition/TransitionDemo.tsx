import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useCanvasScene } from "../canvas/useCanvasScene";
import { Navigate, useParams } from "react-router";
import { HTMLTexture } from "../canvas/HTMLTexture";
import { TransitionPage } from "./TransitionPage";
import { pages, laserPages } from "./pages";
import "../canvas/canvas.css";
import "./transition.css";

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

  const [host, engine] = useCanvasScene(async (element, signal, ready) => {
    // レーザーではPixiJS、タイルではThree.jsだけを読み込む。
    const createTransition =
      effect === "laser"
        ? (await import("../canvas/laser/LaserTransition")).createLaserTransition
        : (await import("./TiledTransition")).createTiledTransition;
    await ready;
    signal.throwIfAborted();
    const instance = await createTransition(
      element,
      Array.from(stage.current!.querySelectorAll<HTMLCanvasElement>(".capture-staging canvas")),
      signal,
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
    signal.throwIfAborted();
    // 初期化中にスクロールした場合も、最初の演出へ現在の表示位置を渡す。
    instance.scrollTo(page, document.current!.scrollTop);
    return instance;
  });

  useEffect(() => {
    engine?.transitionTo(page);
  }, [page, engine]);

  return (
    <main className="experiment">
      <section
        ref={stage}
        className={`canvas-stage transition-stage effect-${effect} ${engine ? "has-scene" : ""} ${animating ? "is-transitioning" : ""}`}
      >
        <div className="transition-host" ref={host} />
        <div
          ref={document}
          className="transition-document scrollable"
          inert={animating}
          onScroll={(event) => engine?.scrollTo(displayed, event.currentTarget.scrollTop)}
        >
          <TransitionPage page={displayed} basePath={basePath} laser={laser} />
        </div>
        {catalog.map(({ id }, index) => (
          <HTMLTexture key={id}>
            <div className="capture-page">
              <TransitionPage page={index} basePath={basePath} laser={laser} />
            </div>
          </HTMLTexture>
        ))}
      </section>
    </main>
  );
}

/** URLに対応したHTMLページをレーザーまたはタイルで切り替える。 */
export function TransitionDemo({ effect = "tiles" }: { effect?: Effect }) {
  const { page: id } = useParams();
  const catalog = effect === "laser" ? laserPages : pages;
  const page = catalog.findIndex((item) => item.id === id);
  const basePath = effect === "laser" ? "/laser" : "/transition";
  if (page < 0) return <Navigate to={`${basePath}/01`} replace />;
  return <TransitionViewport key={effect} page={page} effect={effect} basePath={basePath} />;
}
