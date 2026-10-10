type PaintCanvas = HTMLCanvasElement & {
  requestPaint(): void;
  updateElementGeometry(element: Element): void;
};
type PaintContext = CanvasRenderingContext2D & {
  drawElementImage(source: HTMLElement, x: number, y: number, width: number, height: number): void;
};

/** フォントの準備後に購読し、HTMLとテクスチャを同じpaint内で更新する。 */
export function createHTMLCapture(
  canvas: HTMLCanvasElement,
  onUpdate: () => void,
  signal: AbortSignal,
) {
  const painted = Promise.withResolvers<void>();
  const source = canvas.firstElementChild as HTMLElement;
  const context = canvas.getContext("2d") as PaintContext;

  function paint() {
    // 幅と高さがあるCanvasを転送し、レイアウト変更後の寸法へ合わせる。
    if (!canvas.width || !canvas.height) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawElementImage(source, 0, 0, canvas.width, canvas.height);
    // 元HTMLのCSS変形を保って登録し、曲面上でもクリック・選択をブラウザーに任せる。
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

  canvas.addEventListener("paint", paint, { signal });
  // 起動中の画面離脱でも待機を終え、呼び出し元の初期化を完了させる。
  signal.addEventListener("abort", () => painted.resolve(), { once: true });
  refresh();
  return { refresh, painted: painted.promise };
}
