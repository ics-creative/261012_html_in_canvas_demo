import { Matrix3, Vector3, type Camera, type Mesh } from "three/webgpu";

/** HTMLのヒット位置を同期するネイティブCanvas API。 */
export type HitCanvas = HTMLCanvasElement & {
  updateElementGeometry(element: Element): void;
  clearElementGeometry(element: Element): void;
};

/** 曲面UVから変換したHTML座標と、投影に使う三角形。 */
export type HTMLPoint = {
  index: number;
  x: number;
  y: number;
  mesh: Mesh;
  triangle: number[];
  flipX: boolean;
};

/** 3D曲面の座標を元HTMLへ合わせ、ブラウザー本来の入力・選択・メニューを使う。 */
export function createHTMLHitTarget(
  canvas: HitCanvas,
  pages: HTMLElement[],
  camera: Camera,
  { width, height }: { width: number; height: number },
) {
  let active: HTMLElement | null = null;
  const selection = document.getSelection()!;
  const source = new Matrix3();
  const screen = new Matrix3();
  const vertex = new Vector3();
  // 翻訳によるTextノードの変更は、標準paintで描画へ反映する。
  // 文字座標と選択範囲の管理は、ブラウザーへ任せる。

  const clear = () => {
    if (canvas.contains(selection.anchorNode)) selection.removeAllRanges();
  };

  function hide() {
    if (!active) return;
    canvas.clearElementGeometry(active);
    active = null;
  }

  function move(
    point: HTMLPoint | null,
    { clientX, clientY }: Pick<MouseEvent, "clientX" | "clientY">,
  ) {
    if (!point) return hide();
    const target = pages[point.index];
    if (target !== active) hide();
    active = target;
    const bounds = canvas.getBoundingClientRect();
    const { mesh, triangle } = point;
    const position = mesh.geometry.getAttribute("position");
    const uv = mesh.geometry.getAttribute("uv");
    // 曲面の三角形から縮尺と傾きを求め、ドラッグ中のHTML座標も見た目へ合わせる。
    triangle.forEach((index, column) => {
      const offset = column * 3;
      source.elements[offset] = (point.flipX ? 1 - uv.getX(index) : uv.getX(index)) * width;
      source.elements[offset + 1] = (1 - uv.getY(index)) * height;
      source.elements[offset + 2] = 1;
      vertex.set(position.getX(index), position.getY(index), position.getZ(index));
      vertex.applyMatrix4(mesh.matrixWorld).project(camera);
      screen.elements[offset] = (vertex.x + 1) * bounds.width * 0.5;
      screen.elements[offset + 1] = (1 - vertex.y) * bounds.height * 0.5;
      screen.elements[offset + 2] = 1;
    });
    const [a, b, , c, d] = screen.multiply(source.invert()).elements;
    // HTMLTextureはCSS変形前を描く。ブラウザーの選択・カーソルには元HTMLの変形を使う。
    target.style.transform = new DOMMatrix([
      a,
      b,
      c,
      d,
      clientX - bounds.left - a * point.x - c * point.y,
      clientY - bounds.top - b * point.x - d * point.y,
    ]).toString();
    canvas.updateElementGeometry(target);
  }

  return {
    move,
    hide,
    clear,
    finish(point: HTMLPoint | null, event: MouseEvent) {
      if (selection.isCollapsed) return;
      move(point, event);
      // 曲面の座標更新前に判定された終点を、最後のHTML上のキャレット位置へ揃える。
      const caret = document.caretPositionFromPoint(event.clientX, event.clientY);
      if (caret && canvas.contains(selection.anchorNode)) {
        selection.extend(caret.offsetNode, caret.offset);
      }
    },
    selectAll(start: number, end: number) {
      // ハイライトの描画はHTML-in-Canvasのpaintイベントに任せる。
      selection.setBaseAndExtent(pages[start], 0, pages[end], pages[end].childNodes.length);
    },
  };
}
