import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router";
import { App } from "./app/App";

// HashRouterの入口をルートへ揃え、以前のpathnameをデモ内リンクに持ち越さない。
if (location.pathname !== "/") {
  history.replaceState(history.state, "", `/${location.search}${location.hash}`);
}

// 移動先の準備は即座に始め、表示交換のstartTransitionはDemoViewportで行う。
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter useTransitions={false}>
      <App />
    </HashRouter>
  </StrictMode>,
);
