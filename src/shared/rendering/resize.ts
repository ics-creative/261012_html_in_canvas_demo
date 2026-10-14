/** 初回とサイズ変更時に描画寸法を揃える。 */
export function observeSize(host: HTMLElement, resize: () => void) {
  function update() {
    // レイアウト変更後に幅と高さが確定した時点で、描画寸法を更新する。
    if (host.clientWidth && host.clientHeight) resize();
  }

  new ResizeObserver(update).observe(host);
  update();
}
