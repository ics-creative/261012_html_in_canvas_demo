import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router";
import { App } from "./app/components/App";

// デモ間は文書を読み込み、HashRouterは誌面内のページURLを切り替える。
// 描画の準備中はLoadingを表示する。
createRoot(document.getElementById("root")!).render(
  <HashRouter useTransitions={false}>
    <App />
  </HashRouter>,
);
