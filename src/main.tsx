import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router";
import { App } from "./app/App";

// 公開フォルダーを保ち、HashRouterはハッシュ内のデモURLだけを切り替える。
// デモの切り替えを即座に反映し、描画の準備はLoadingで示す。
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter useTransitions={false}>
      <App />
    </HashRouter>
  </StrictMode>,
);
