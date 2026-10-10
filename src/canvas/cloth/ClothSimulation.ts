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

  // 更新は一回ずつ送り、完了した姿勢を受け取る。
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
      // 受信した姿勢を一度GPUへ転送し、視点の描画でも同じ頂点を使う。
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
