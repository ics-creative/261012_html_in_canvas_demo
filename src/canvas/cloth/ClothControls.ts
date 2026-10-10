import * as THREE from "three";
import { DragGesture } from "@use-gesture/vanilla";
import { createOrbit, createPointerRay } from "../orbit";
import { onCleanup } from "../lifecycle";
import type { createClothSimulation } from "./ClothSimulation";

/** 布のドラッグを視点回転から分離する。 */
export function createClothControls(
  camera: THREE.Camera,
  canvas: HTMLCanvasElement,
  {
    physics,
    picking,
  }: { physics: Awaited<ReturnType<typeof createClothSimulation>>; picking: THREE.Mesh },
  signal: AbortSignal,
) {
  const orbit = createOrbit(camera, canvas, signal);
  // 正面から導入し、視点の回転範囲を布の中心以上の高さへ制限する。
  orbit.minPolarAngle = 0.2;
  orbit.maxPolarAngle = Math.PI / 2;
  orbit.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
  const ray = createPointerRay(camera, canvas);
  const plane = new THREE.Plane();
  const offset = new THREE.Vector3();
  const target = new THREE.Vector3();
  const positions = picking.geometry.getAttribute("position");

  const drag = new DragGesture<PointerEvent>(
    canvas,
    ({ event, first, last }) => {
      if (!event.isPrimary) return;
      if (last) {
        if (!orbit.enabled) physics.releaseGrab(event.type !== "pointerup");
        orbit.enabled = true;
      } else if (first) {
        if (event.button !== 0) return;
        // 正規化デバイス座標のポインターが布に重なるかを調べる。
        const intersection = ray(event).intersectObject(picking)[0];
        if (!intersection?.face) return;
        const { face, point } = intersection;
        // レイが当たった面の3頂点を読み、掴む点を選ぶ。
        const nearest = [face.a, face.b, face.c].toSorted(
          (a, b) =>
            target.fromBufferAttribute(positions, a).distanceToSquared(point) -
            target.fromBufferAttribute(positions, b).distanceToSquared(point),
        )[0];
        target.fromBufferAttribute(positions, nearest);
        // カメラに平行な面で布を掴み、視点回転と切り分ける。
        camera.getWorldDirection(plane.normal);
        plane.setFromNormalAndCoplanarPoint(plane.normal, point);
        offset.copy(target).sub(point).addScaledVector(plane.normal, -64);
        orbit.enabled = !physics.grab(nearest, target);
      } else if (!orbit.enabled && ray(event).ray.intersectPlane(plane, target)) {
        physics.moveGrab(target.add(offset));
      }
    },
    { eventOptions: { capture: true }, pointer: { buttons: -1, keys: false } },
  );
  // 掴むカーソルは、CSSの:activeで表示する。
  // ドラッグを解除し、入力イベントと視点操作を破棄する。
  onCleanup(signal, () => {
    physics.releaseGrab(true);
    drag.destroy();
  });
  return orbit;
}
