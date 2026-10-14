import { Suspense, useRef, useState, type ReactNode } from "react";
import { SceneReadyContext } from "../canvas/useCanvasScene";
import { GlassControls, GlassControlsContext } from "../glass/GlassControls";

/** 文書ごとの描画領域とLoadingを配置する。 */
export function DemoViewport({ children, route }: { children: ReactNode; route: string }) {
  const glassControls = useRef<HTMLElement>(null);
  const [loading, setLoading] = useState(true);

  // 描画領域のIDを、現在地リンクの参照先にする。
  return (
    <div className="demo-viewport" id={`/${route}`}>
      <GlassControlsContext value={glassControls}>
        {/* ガラスのツールバーを先に描き、屈折処理の寸法を初回から測る。 */}
        {route.startsWith("glass") && <GlassControls ref={glassControls} route={route} />}
        {/* 最初の描画までLoadingを重ね、描画完了と同じフレームで操作を有効にする。 */}
        <SceneReadyContext value={() => setLoading(false)}>
          <Suspense fallback={<Loading />}>
            <div className="demo-layer" inert={loading}>
              {children}
            </div>
            {loading && <Loading />}
          </Suspense>
        </SceneReadyContext>
      </GlassControlsContext>
    </div>
  );
}

function Loading() {
  return <div className="demo-loading">Loading...</div>;
}
