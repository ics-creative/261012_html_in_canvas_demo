import { releaseProxy, transfer, wrap } from "comlink";
import { CLOTH_COLUMNS, type ClothPoint } from "./ClothPhysics";
import type { createClothWorker } from "./ClothWorker";
import { onCleanup } from "../lifecycle";

/** 格子の密度と物理を保ち、距離制約の計算を描画スレッドから分離する。 */
export async function createClothSimulation(initialPose: Float32Array, signal: AbortSignal) {
  const worker = new Worker(new URL("./ClothWorker.ts", import.meta.url), { type: "module" });
  const factory = wrap<typeof createClothWorker>(worker);
  const pose = initialPose.slice();
  const physics = await factory(transfer(pose, [pose.buffer]));
  onCleanup(signal, () => {
    // ドラッグの終了通知を先に送り、その後に通信とワーカーを解放する。
    queueMicrotask(() => {
      physics[releaseProxy]();
      factory[releaseProxy]();
      worker.terminate();
    });
  });
  signal.throwIfAborted();
  let elapsed = 0;
  let pending = false;
  let updated = false;

  // 計算中は次の更新を溜めず、完了した姿勢だけを受け取る。
  async function receive(time: number, wind: number) {
    pending = true;
    elapsed = 0;
    initialPose.set(await physics.update(time, wind));
    pending = false;
    updated = true;
  }

  return {
    interpolatedPositions: initialPose,
    update(delta: number, wind: number) {
      elapsed += delta;
      if (!pending) receive(elapsed, wind);
      // GPUへの転送は受信した姿勢につき一度にし、視点だけの描画では再送しない。
      const changed = updated;
      updated = false;
      return changed;
    },
    grab(index: number, point: ClothPoint) {
      if (index === 0 || index === CLOTH_COLUMNS) return false;
      physics.grab(index, point);
      return true;
    },
    moveGrab: physics.moveGrab,
    releaseGrab: physics.releaseGrab,
  };
}
