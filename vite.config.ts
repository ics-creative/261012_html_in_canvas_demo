import { defineConfig } from "vite";

/** ReactとESNextを使用するVite設定。 */
export default defineConfig({
  // GitHub Pagesの公開フォルダーでも、生成物を相対パスで読み込む。
  base: "./",
});
