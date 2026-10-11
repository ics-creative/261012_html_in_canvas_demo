import { Activity, Suspense, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Routes, useLocation, type Location } from "react-router";
import { SceneReadyContext } from "../canvas/useCanvasScene";
import { GlassControls, GlassControlsContext } from "../glass/GlassControls";

function demoPath({ pathname }: Location) {
  return pathname.split("/").slice(0, 2).join("/");
}

/** 移動先を即表示し、CRTの入力をActivityで保持する。 */
export function DemoViewport({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [forms, setForms] = useState<Location[]>([]);
  const glassControls = useRef<HTMLElement>(null);
  const requested = demoPath(location);
  // 訪問済みのフォームと入力を保持し、非表示のGPU描画を休止する。
  if (["/crt", "/crt-3d"].includes(requested) && !forms.includes(location)) {
    setForms([...forms.filter((route) => demoPath(route) !== requested), location]);
  }
  const locations = [location, ...forms.filter((route) => demoPath(route) !== requested)];

  // リンク先のDOMを保持し、描画領域のIDで現在地のアンカーを更新する。
  return (
    <div className="demo-viewport" id={requested.startsWith("/glass") ? "/glass" : requested}>
      <GlassControlsContext value={glassControls}>
        {/* 描画方式を替えてもツールバーを保ち、選択背景の移動を連続させる。 */}
        {requested.startsWith("/glass") && (
          <GlassControls ref={glassControls} css={requested === "/glass-css"} />
        )}
        {locations.map((route) => {
          const path = demoPath(route);
          return (
            <Activity key={path} mode={path === requested ? "visible" : "hidden"}>
              <DemoScene location={route}>{children}</DemoScene>
            </Activity>
          );
        })}
      </GlassControlsContext>
    </div>
  );
}

function DemoScene({ location, children }: { location: Location; children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  // Activityの再表示でも、GPUを準備する間はLoadingへ戻す。
  useLayoutEffect(() => setLoading(true), []);
  return (
    <SceneReadyContext value={() => setLoading(false)}>
      <Suspense fallback={<Loading />}>
        <div className="demo-layer" inert={loading}>
          <Routes location={location}>{children}</Routes>
        </div>
        {loading && <Loading />}
      </Suspense>
    </SceneReadyContext>
  );
}

function Loading() {
  return <div className="demo-loading">Loading...</div>;
}
