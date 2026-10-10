/** 初回とサイズ変更時に描画寸法を揃え、画面の離脱で監視を止める。 */
export function observeSize(host: HTMLElement, resize: () => void, signal: AbortSignal) {
  function update() {
    // レイアウト変更後に幅と高さが確定した時点で、描画寸法を更新する。
    if (host.clientWidth && host.clientHeight) resize();
  }

  const observer = new ResizeObserver(update);
  observer.observe(host);
  signal.addEventListener("abort", () => observer.disconnect(), { once: true });
  update();
}
