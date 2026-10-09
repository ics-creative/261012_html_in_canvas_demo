import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { own } from "./lifecycle";
import { observeSize } from "./resize";

/** 視点回転に減衰を付け、画面の終了と一緒に操作を解除する。 */
export function createOrbit(camera: THREE.Camera, element: HTMLElement, signal: AbortSignal) {
  const orbit = own(signal, new OrbitControls(camera, element));
  orbit.enableDamping = true;
  orbit.dampingFactor = 0.08;
  orbit.enablePan = false;
  orbit.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
  return orbit;
}

/** DOM上のポインター位置を、カメラからの一本のレイへ変換する。 */
export function createPointerRay(camera: THREE.Camera, element: HTMLElement) {
  const ray = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  return ({ clientX, clientY }: Pick<MouseEvent, "clientX" | "clientY">) => {
    const rect = element.getBoundingClientRect();
    pointer.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      1 - ((clientY - rect.top) / rect.height) * 2,
    );
    ray.setFromCamera(pointer, camera);
    return ray;
  };
}

/** リサイズ時もユーザーのアングルとズーム比率を保ち、被写体を画面へ収める。 */
export function fitOrbit(
  renderer: THREE.Renderer,
  host: HTMLElement,
  camera: THREE.PerspectiveCamera,
  orbit: OrbitControls,
  signal: AbortSignal,
  frame: {
    width: number;
    height: number;
    position(distance: number): void;
    zoom: [number, number];
  },
) {
  let previous = 0;
  observeSize(
    host,
    () => {
      const { width, height } = host.getBoundingClientRect();
      renderer.setSize(width, height);
      camera.aspect = width / height;
      const distance =
        Math.max(frame.height, frame.width / camera.aspect) /
        (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
      if (previous)
        camera.position
          .sub(orbit.target)
          .multiplyScalar(distance / previous)
          .add(orbit.target);
      else frame.position(distance);
      previous = distance;
      // 被写体ごとの拡大・縮小の限界を、画面寸法に合わせて更新する。
      orbit.minDistance = distance * frame.zoom[0];
      orbit.maxDistance = distance * frame.zoom[1];
      camera.far = distance * 6;
      orbit.update();
      camera.updateProjectionMatrix();
    },
    signal,
  );
}
