/** 表示中の領域だけを描画し、スクロール位置とCanvasの寸法を揃える。 */
export function createPageCapture(canvases: HTMLCanvasElement[]) {
  // Three.jsが元HTMLを描画Canvasへ移す前に、寸法とスクロールの操作先を保持する。
  const sources = canvases.flatMap((canvas) =>
    Array.from(canvas.querySelectorAll<HTMLElement>("[drawable]")),
  );
  const layouts = sources.flatMap((source) =>
    Array.from(source.querySelectorAll<HTMLElement>(":scope > div")),
  );
  const pages = sources.flatMap((source) =>
    Array.from(source.querySelectorAll<HTMLElement>(".capture-page")),
  );

  function resize(width: number, height: number) {
    const resized =
      sources[0].offsetWidth !== width * devicePixelRatio ||
      sources[0].offsetHeight !== height * devicePixelRatio;
    canvases.forEach((canvas, index) => {
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      sources[index].style.width = `${width * devicePixelRatio}px`;
      sources[index].style.height = `${height * devicePixelRatio}px`;
      layouts[index].style.width = `${width}px`;
      layouts[index].style.height = `${height}px`;
    });
    return resized;
  }

  function scrollTo(index: number, top: number) {
    pages[index].scrollTop = top;
  }

  return { resize, scrollTo };
}
