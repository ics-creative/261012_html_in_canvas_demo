import { Suspense, useRef, useState, type ReactNode } from "react";
import { Routes, useLocation } from "react-router";
import { SceneReadyContext } from "../canvas/useCanvasScene";
import { GlassControls, GlassControlsContext } from "../glass/GlassControls";

/** 表示中のデモを描き、別のデモへ移動すると破棄する。 */
export function DemoViewport({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const glassControls = useRef<HTMLElement>(null);
  const requested = pathname.split("/").slice(0, 2).join("/");

  // 描画領域のIDで、表示中のデモを現在地のアンカーへ伝える。
  return (
    <div className="demo-viewport" id={requested.startsWith("/glass") ? "/glass" : requested}>
      <GlassControlsContext value={glassControls}>
        {/* ガラスのデモでツールバーを表示し、初回から屈折処理の寸法を測る。
            描画方式を替えても保ち、選択背景の移動を連続させる。 */}
        {requested.startsWith("/glass") && (
          <GlassControls ref={glassControls} css={requested === "/glass-css"} />
        )}
        {/* デモを切り替えるとアンマウントし、入力状態とGPU資源を解放する。 */}
        <DemoScene key={requested}>{children}</DemoScene>
      </GlassControlsContext>
    </div>
  );
}

function DemoScene({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  return (
    <SceneReadyContext value={() => setLoading(false)}>
      <Suspense fallback={<Loading />}>
        <div className="demo-layer" inert={loading}>
          <Routes>{children}</Routes>
        </div>
        {loading && <Loading />}
      </Suspense>
    </SceneReadyContext>
  );
}

function Loading() {
  return <div className="demo-loading">Loading...</div>;
}
