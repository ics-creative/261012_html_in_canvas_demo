import { Activity, startTransition, Suspense, useState, type ReactNode } from "react";
import { Routes, useLocation, type Location } from "react-router";
import { SceneReadyContext } from "../canvas/useCanvasScene";

function demoPath({ pathname }: Location) {
  return pathname.split("/").slice(0, 2).join("/");
}

/** 移動先の初期描画を待ち、同じDOMのまま表示を切り替える。 */
export function DemoViewport({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [displayed, setDisplayed] = useState(location);
  const [forms, setForms] = useState<Location[]>([]);
  const requested = demoPath(location);
  const active = demoPath(displayed);
  // 同じデモのページ送りでは描画エンジンを保ち、離れる際も最新のURLを残す。
  if (active === requested && displayed !== location) setDisplayed(location);
  // 訪問済みのフォームだけを保持し、入力を消さずにGPU描画を休止する。
  if (["/crt", "/crt-3d"].includes(requested) && !forms.includes(location)) {
    setForms([...forms.filter((route) => demoPath(route) !== requested), location]);
  }
  const locations = active === requested ? [location] : [displayed, location];
  for (const form of forms) {
    if (!locations.some((route) => demoPath(route) === demoPath(form))) locations.push(form);
  }

  function ready(next: Location) {
    // 初期化中に行き先が変わった場合は、古い画面を表示へ戻さない。
    if (demoPath(next) === active || demoPath(next) !== requested) return;
    startTransition(() => setDisplayed(location));
  }

  // リンク先のDOMを保ってIDだけを変え、現在地のアンカーを途切れさせない。
  return (
    <div className="demo-viewport" id={active === "/glass-svg" ? "/glass" : active}>
      {locations.map((route) => {
        const path = demoPath(route);
        const visible = path === active;
        return (
          <Activity key={path} mode={visible || path === requested ? "visible" : "hidden"}>
            <div className="demo-layer" style={{ zIndex: visible ? 1 : 0 }} inert={!visible}>
              <SceneReadyContext value={() => ready(route)}>
                {/* 背後で初期描画し、Canvasの表示切替による空のフレームを出さない。 */}
                <Suspense fallback={null}>
                  <Routes location={route}>{children}</Routes>
                </Suspense>
              </SceneReadyContext>
            </div>
          </Activity>
        );
      })}
    </div>
  );
}
