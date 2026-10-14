type PaintCanvas = HTMLCanvasElement & {
  requestPaint(): void;
  updateElementGeometry(element: Element): void;
};
type PaintContext = CanvasRenderingContext2D & {
  drawElementImage(source: HTMLElement, x: number, y: number, width: number, height: number): void;
};

/** paintを購読し、HTMLとテクスチャを同じタイミングで更新する。 */
export function createHtmlCapture(canvas: HTMLCanvasElement, onUpdate: () => void) {
  const painted = Promise.withResolvers<void>();
  const source = canvas.firstElementChild as HTMLElement;
  const context = canvas.getContext("2d") as PaintContext;

  function paint() {
    // 幅と高さがあるCanvasを転送し、レイアウト変更後の寸法へ合わせる。
    if (!canvas.width || !canvas.height) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawElementImage(source, 0, 0, canvas.width, canvas.height);
    // 画面と同じCSS寸法のHTMLを登録し、入力・選択領域を描画位置へ合わせる。
    (canvas as PaintCanvas).updateElementGeometry(source);
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
