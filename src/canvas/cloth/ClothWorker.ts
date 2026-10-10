import { expose, proxy, transfer } from "comlink";
import { createClothPhysics } from "./ClothPhysics";

/** 布の時間更新とポインター操作をワーカーへ送る。 */
export function createClothWorker(initialPose: Float32Array) {
  // 最初の呼び出しで姿勢を揃え、未初期化の物理状態を持ち回さない。
  const { interpolatedPositions, ...physics } = createClothPhysics(initialPose);
  return proxy({
    ...physics,
    update(elapsed: number, wind: number) {
      // タブを離れた時間や描画待ちを、まとめてシミュレーションしない。
      physics.update(Math.min(elapsed, 0.04), wind);
      const positions = interpolatedPositions.slice();
      return transfer(positions, [positions.buffer]);
    },
  });
}

expose(createClothWorker);
