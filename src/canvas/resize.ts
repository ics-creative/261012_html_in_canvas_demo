/** 初回とサイズ変更時に描画寸法を揃え、画面の離脱で監視を止める。 */
export function observeSize(host: HTMLElement, resize: () => void, signal: AbortSignal) {
  function update() {
    // レイアウト変更中の高さ0ではGPU画像を作れないため、寸法の確定を待つ。
    if (host.clientWidth && host.clientHeight) resize();
  }

  const observer = new ResizeObserver(update);
  observer.observe(host);
  signal.addEventListener("abort", () => observer.disconnect(), { once: true });
  update();
}
