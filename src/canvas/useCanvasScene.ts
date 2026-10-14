import { createContext, useContext, useLayoutEffect, useRef, useState } from "react";

/** 最初の描画を終えた画面を、共通の表示切り替えへ知らせる。 */
export const SceneReadyContext = createContext(() => {});

/** 文書の読み込み時にフォント・写真・GPUを準備する。 */
export function useCanvasScene<T>(
  create: (host: HTMLDivElement, ready: Promise<unknown>) => Promise<T>,
) {
  const host = useRef<HTMLDivElement>(null);
  const [scene, setScene] = useState<T>();
  // 初期描画の完了を、そのデモのLoadingへ通知する。
  const onReady = useContext(SceneReadyContext);
  useLayoutEffect(() => {
    async function initialize() {
      try {
        // 最初のフレームでLoadingを描き、次のフレームからGPUの準備を始める。
        await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);
        // HTMLの読み込み中もGPUを準備し、取り込み直前だけreadyを待つ。
        const images = host.current!.parentElement!.querySelectorAll("img");
        const ready = Promise.all([
          document.fonts.ready,
          ...Array.from(images, (image) => image.decode()),
        ]);
        const instance = await create(host.current!, ready);
        // 最初の描画フレームを待ってから、表示準備の完了を通知する。
        await new Promise(requestAnimationFrame);
        setScene(instance);
        onReady();
      } catch (error) {
        console.error(error);
      }
    }
    initialize();
  }, []);
  return [host, scene] as const;
}
