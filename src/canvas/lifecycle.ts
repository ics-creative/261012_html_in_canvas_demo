/** 初期化中の離脱にも対応し、画面に属する資源を一度だけ解放する。 */
export function onCleanup(signal: AbortSignal, dispose: () => void) {
  // 作成元の購読順で、描画先と素材の依存関係に沿って解放する。
  if (signal.aborted) return dispose();
  signal.addEventListener("abort", dispose, { once: true });
}

/** 作成したGPU資源の所有権を画面にまとめる。 */
export function own<T extends { dispose(): void }>(signal: AbortSignal, resource: T): T {
  onCleanup(signal, () => resource.dispose());
  return resource;
}
