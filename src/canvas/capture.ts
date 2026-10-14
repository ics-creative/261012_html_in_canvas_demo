type PaintCanvas = HTMLCanvasElement & {
  requestPaint(): void;
};
type PaintContext = CanvasRenderingContext2D & {
  drawElementImage(source: HTMLElement, x: number, y: number, width: number, height: number): void;
};

/** フォントの準備後に購読し、HTMLとテクスチャを同じpaint内で更新する。 */
export function createHTMLCapture(canvas: HTMLCanvasElement, onUpdate: () => void) {
  const painted = Promise.withResolvers<void>();
  const source = canvas.firstElementChild as HTMLElement;
  const context = canvas.getContext("2d") as PaintContext;

  function paint() {
    // 幅と高さがあるCanvasを転送し、レイアウト変更後の寸法へ合わせる。
    if (!canvas.width || !canvas.height) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    // 2D描画の位置と倍率は、drawElementImageが入力・選択領域へ自動で反映する。
    context.drawElementImage(source, 0, 0, canvas.width, canvas.height);
    onUpdate();
    painted.resolve();
  }

  function refresh() {
    // 3Dの入力領域が全画面でも、描くHTMLの原寸だけをテクスチャへ送る。
    canvas.width = source.clientWidth * devicePixelRatio;
    canvas.height = source.clientHeight * devicePixelRatio;
    (canvas as PaintCanvas).requestPaint();
  }

  canvas.addEventListener("paint", paint);
  refresh();
  return { refresh, painted: painted.promise };
}
