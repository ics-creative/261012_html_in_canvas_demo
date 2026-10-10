import { expose, proxy, transfer } from "comlink";
import { createClothPhysics } from "./ClothPhysics";

/** 布の時間更新とポインター操作をワーカーへ送る。 */
export function createClothWorker(initialPose: Float32Array) {
  // 最初の呼び出しで物理状態を初期化し、姿勢を揃える。
  const { interpolatedPositions, ...physics } = createClothPhysics(initialPose);
  return proxy({
    ...physics,
    update(elapsed: number, wind: number) {
      // 進行時間を上限付きで積算し、タブの復帰時も短いステップで進める。
      physics.update(Math.min(elapsed, 0.04), wind);
      const positions = interpolatedPositions.slice();
      return transfer(positions, [positions.buffer]);
    },
  });
}

expose(createClothWorker);
