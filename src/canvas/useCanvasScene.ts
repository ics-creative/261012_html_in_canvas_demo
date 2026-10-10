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

/** フォント・写真・GPUの準備をActionで待ち、非表示時は描画を止める。 */
export function useCanvasScene<T>(
  create: (host: HTMLDivElement, signal: AbortSignal, ready: Promise<void>) => Promise<T>,
) {
  const host = useRef<HTMLDivElement>(null);
  const [scene, setScene] = useState<T>();
  const [initializing, startInitialization] = useTransition();
  const onReady = useContext(SceneReadyContext);
  // 待機中に行き先が変わっても、完了通知には最新の遷移先を使う。
  const notifyReady = useEffectEvent(onReady);
  useLayoutEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    startInitialization(async () => {
      try {
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
    return () => {
      controller.abort();
      setScene(undefined);
    };
  }, []);
  return [host, initializing ? undefined : scene] as const;
}
