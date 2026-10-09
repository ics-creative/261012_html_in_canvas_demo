import { Vector3 } from "three";
import { CLOTH_COLUMNS, type ClothPoint } from "./ClothPhysics";
import type { ClothCommand } from "./ClothWorker";
import { onCleanup } from "../lifecycle";

/** 格子の密度と物理を保ち、距離制約の計算を描画スレッドから分離する。 */
export function createClothSimulation(initialPose: Float32Array, signal: AbortSignal) {
  const worker = new Worker(new URL("./ClothWorker.ts", import.meta.url), { type: "module" });
  onCleanup(signal, () => worker.terminate());
  const positions = Array.from({ length: initialPose.length / 3 }, (_, index) =>
    new Vector3().fromArray(initialPose, index * 3),
  );
  const interpolatedPositions = initialPose;
  const pose = initialPose.slice();
  worker.postMessage(pose, [pose.buffer]);
  let elapsed = 0;
  let pending = false;
  let updated = false;

  // 計算中は次の更新を溜めず、完了した姿勢だけを受け取る。
  worker.addEventListener("message", ({ data }: MessageEvent<Float32Array>) => {
    interpolatedPositions.set(data);
    positions.forEach((position, index) => position.fromArray(data, index * 3));
    pending = false;
    updated = true;
  });
  const send: (command: ClothCommand) => void = worker.postMessage.bind(worker);

  return {
    positions,
    interpolatedPositions,
    update(delta: number, wind: number) {
      elapsed += delta;
      if (!pending) {
        pending = true;
        send({ type: "update", elapsed, wind });
        elapsed = 0;
      }
      // GPUへの転送は受信した姿勢につき一度にし、視点だけの描画では再送しない。
      const changed = updated;
      updated = false;
      return changed;
    },
    grab(index: number, point: ClothPoint) {
      if (index === 0 || index === CLOTH_COLUMNS) return false;
      send({ type: "grab", index, point });
      return true;
    },
    moveGrab(point: ClothPoint) {
      send({ type: "move", point });
    },
    releaseGrab(immediate = false) {
      send({ type: "release", immediate });
    },
  };
}
