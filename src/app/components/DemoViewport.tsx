import { Suspense, useRef, type ReactNode } from "react";
import { GlassControls, GlassControlsContext } from "../../demos/glass/components/GlassControls";

/** 文書ごとの描画領域とLoadingを配置する。 */
export function DemoViewport({ children, route }: { children: ReactNode; route: string }) {
  const glassControls = useRef<HTMLElement>(null);

  // 描画領域のIDを、ヘッダーのリンク先と揃える。
  return (
    <div className="demo-viewport" id={`/${route}`}>
      <GlassControlsContext value={glassControls}>
        {/* ガラスのツールバーを先に描き、屈折処理の寸法を初回から測る。 */}
        {route.startsWith("glass") && <GlassControls ref={glassControls} route={route} />}
        {/* lazyで読み込むデモの待機表示を、Suspenseへまとめる。 */}
        <Suspense fallback={<div className="demo-loading"></div>}>
          <div className="demo-layer">{children}</div>
        </Suspense>
      </GlassControlsContext>
    </div>
  );
}
