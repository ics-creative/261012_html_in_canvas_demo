import { useLayoutEffect, useRef, useState } from "react";

/** 描画先のDOMが配置された後にGPUを初期化する。 */
export function useCanvasScene<T>(create: (host: HTMLDivElement) => Promise<T>) {
  const host = useRef<HTMLDivElement>(null);
  const [scene, setScene] = useState<T>();
  useLayoutEffect(() => {
    async function initialize() {
      try {
        setScene(await create(host.current!));
      } catch (error) {
        console.error(error);
      }
    }
    initialize();
  }, []);
  return [host, scene] as const;
}
