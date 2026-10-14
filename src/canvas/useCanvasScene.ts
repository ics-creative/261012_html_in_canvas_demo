import {
  createContext,
  useContext,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
} from "react";

/** 最初の描画を終えた画面を、共通の表示切り替えへ知らせる。 */
export const SceneReadyContext = createContext(() => {});

/** フォント・写真・GPUの準備をActionで待ち、ページ離脱時に資源を解放する。 */
export function useCanvasScene<T>(
  create: (host: HTMLDivElement, signal: AbortSignal, ready: Promise<void>) => Promise<T>,
) {
  const host = useRef<HTMLDivElement>(null);
  const [scene, setScene] = useState<T>();
  const [initializing, startInitialization] = useTransition();
  const onReady = useContext(SceneReadyContext);
  // 初期描画の完了を、そのデモのLoadingへ通知する。
  const notifyReady = useEffectEvent(onReady);
  useLayoutEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    startInitialization(async () => {
      try {
        // 最初のフレームでLoadingを描き、次のフレームからGPUの準備を始める。
        await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);
        signal.throwIfAborted();
        // HTMLの読み込み中もGPUを準備し、取り込み直前だけreadyを待つ。
        async function readHTML() {
          const images = host.current!.parentElement!.querySelectorAll("img");
          await Promise.all([
            document.fonts.ready,
            ...Array.from(images, (image) => image.decode()),
          ]);
        }
        const ready = readHTML();
        const instance = await create(host.current!, signal, ready);
        // 最初の描画フレームを待ってから、表示準備の完了を通知する。
        await new Promise(requestAnimationFrame);
        signal.throwIfAborted();
        startInitialization(() => setScene(instance));
        notifyReady();
      } catch (error) {
        if (!signal.aborted) console.error(error);
      }
    });
    return () => controller.abort();
  }, []);
  return [host, initializing ? undefined : scene] as const;
}
