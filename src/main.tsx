import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router";
import { App } from "./app/App";

// 公開フォルダーを保ち、HashRouterはハッシュ内のデモURLだけを切り替える。
// 移動先の準備は即座に始め、表示交換のstartTransitionはDemoViewportで行う。
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter useTransitions={false}>
      <App />
    </HashRouter>
  </StrictMode>,
);
