import { createClothPhysics, type ClothPoint } from "./ClothPhysics";

/** 布の時間更新とポインター操作をワーカーへ送る。 */
export type ClothCommand =
  | { type: "update"; elapsed: number; wind: number }
  | { type: "grab"; index: number; point: ClothPoint }
  | { type: "move"; point: ClothPoint }
  | { type: "release"; immediate: boolean };

// 最初のメッセージで姿勢を揃え、未初期化の物理状態を持ち回さない。
const initialPose = await new Promise<Float32Array>((resolve) => {
  self.addEventListener("message", ({ data }) => resolve(data), { once: true });
});
const physics = createClothPhysics(initialPose);

self.addEventListener("message", ({ data }: MessageEvent<ClothCommand>) => {
  switch (data.type) {
    case "update": {
      // タブを離れた時間や描画待ちを、まとめてシミュレーションしない。
      physics.update(Math.min(data.elapsed, 0.04), data.wind);
      const positions = physics.interpolatedPositions.slice();
      self.postMessage(positions, { transfer: [positions.buffer] });
      break;
    }
    case "grab":
      physics.grab(data.index, data.point);
      break;
    case "move":
      physics.moveGrab(data.point);
      break;
    case "release":
      physics.releaseGrab(data.immediate);
  }
});
