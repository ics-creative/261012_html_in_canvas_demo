import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router";
import { App } from "./app/components/App";

// デモ間は文書を読み込み、HashRouterは誌面内のページURLを切り替える。
// デモのコード読み込み中はSuspenseでLoadingを表示する。
createRoot(document.getElementById("root")!).render(
  <HashRouter>
    <App />
  </HashRouter>,
);
