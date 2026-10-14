import {
  createContext,
  useContext,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

/** 最初の描画を終えた画面を、共通の表示切り替えへ知らせる。 */
export const SceneReadyContext = createContext(() => {});

/** フォント・写真・GPUの準備を待ち、ページ離脱時に資源を解放する。 */
export function useCanvasScene<T>(
  create: (host: HTMLDivElement, signal: AbortSignal, ready: Promise<unknown>) => Promise<T>,
) {
  const host = useRef<HTMLDivElement>(null);
  const [scene, setScene] = useState<T>();
  const onReady = useContext(SceneReadyContext);
  // 初期描画の完了を、そのデモのLoadingへ通知する。
  const notifyReady = useEffectEvent(onReady);
  useLayoutEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    async function initialize() {
      try {
        // 最初のフレームでLoadingを描き、次のフレームからGPUの準備を始める。
        await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);
        signal.throwIfAborted();
        // HTMLの読み込み中もGPUを準備し、取り込み直前だけreadyを待つ。
        const images = host.current!.parentElement!.querySelectorAll("img");
        const ready = Promise.all([
          document.fonts.ready,
          ...Array.from(images, (image) => image.decode()),
        ]);
        const instance = await create(host.current!, signal, ready);
        // 最初の描画フレームを待ってから、表示準備の完了を通知する。
        await new Promise(requestAnimationFrame);
        signal.throwIfAborted();
        setScene(instance);
        notifyReady();
      } catch (error) {
        if (!signal.aborted) console.error(error);
      }
    }
    initialize();
    return () => controller.abort();
  }, []);
  return [host, scene] as const;
}
