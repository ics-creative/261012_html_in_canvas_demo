import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/** ReactとESNextを使用するVite設定。 */
export default defineConfig({
  // GitHub Pagesの公開フォルダーでも、生成物を相対パスで読み込む。
  base: "./",
  plugins: [react()],
  resolve: {
    // 配布用の単一ファイルではなく公式のES Modulesを分割し、CoreとTSLを共有する。
    alias: [
      { find: /^three$/, replacement: "three/src/Three.Core.js" },
      { find: /^three\/webgpu$/, replacement: "three/src/Three.WebGPU.js" },
      { find: /^three\/tsl$/, replacement: "three/src/Three.TSL.js" },
    ],
  },
  css: {
    // :target-currentを正式な構文として解析し、スクロール連動の現在地表示を保つ。
    lightningcss: { drafts: { scrollNavigationControls: true } },
  },
  worker: { format: "es" },
  build: {
    target: "esnext",
    rolldownOptions: {
      output: {
        // TSLのメソッド登録を元の順番で実行し、分割時の循環参照を保つ。
        strictExecutionOrder: true,
        // TSLノードを描画基盤と分け、Three.jsを使うデモから共有する。
        codeSplitting: {
          groups: [
            {
              name: "three-nodes",
              test: /node_modules\/three\/src\/nodes\//,
              includeDependenciesRecursively: false,
            },
          ],
        },
      },
    },
  },
  server: { port: 5180, strictPort: true },
});
