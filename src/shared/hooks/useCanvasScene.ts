import { createContext, useContext, useLayoutEffect, useRef, useState } from "react";

/** 最初の描画を終えた画面を、共通の表示切り替えへ知らせる。 */
export const SceneReadyContext = createContext(() => {});

/** GPUと描画処理を初期化し、完了をLoadingへ通知する。 */
export function useCanvasScene<T>(create: (host: HTMLDivElement) => Promise<T>) {
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
        const instance = await create(host.current!);
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
