import { Suspense, useRef, useState, type ReactNode } from "react";
import { SceneReadyContext } from "../../shared/hooks/useCanvasScene";
import { GlassControls, GlassControlsContext } from "../../demos/glass/components/GlassControls";

/** 文書ごとの描画領域とLoadingを配置する。 */
export function DemoViewport({ children, route }: { children: ReactNode; route: string }) {
  const glassControls = useRef<HTMLElement>(null);
  const [loading, setLoading] = useState(true);

  // 描画領域のIDを、ヘッダーのリンク先と揃える。
  return (
    <div className="demo-viewport" id={`/${route}`}>
      <GlassControlsContext value={glassControls}>
        {/* ガラスのツールバーを先に描き、屈折処理の寸法を初回から測る。 */}
        {route.startsWith("glass") && <GlassControls ref={glassControls} route={route} />}
        {/* コードの読み込みとGPUの準備を一つのLoadingで待ち、描画完了後に操作を有効にする。 */}
        <SceneReadyContext value={() => setLoading(false)}>
          <Suspense fallback={null}>
            <div className="demo-layer" inert={loading}>
              {children}
            </div>
          </Suspense>
          {loading && <Loading />}
        </SceneReadyContext>
      </GlassControlsContext>
    </div>
  );
}

function Loading() {
  return <div className="demo-loading"></div>;
}
