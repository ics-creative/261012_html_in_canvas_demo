import Ammo from "ammojs-typed/wasm";
import wasm from "ammojs-typed/ammo.wasm.wasm?url";
import { Vector3 } from "three";

/** 物理空間の三次元座標。 */
export type ClothPoint = Pick<Vector3, "x" | "y" | "z">;

/** 物理格子の横分割数。CreatePatchの両端を固定点にする。 */
const CLOTH_COLUMNS = 48;

// 布のドラッグ・重力・風圧を固定刻みで解き、フレームレートによる差を抑える。
const STEP = 1 / 120;
const SCALE = 0.01;

/** Ammoのソフトボディで、布の伸び・曲げ・床との衝突を解く。 */
export async function createClothPhysics(initialPose: Float32Array) {
  // WASMで格子の密度と物理を保ち、距離制約の計算を実行する。
  // 最初の呼び出しで物理状態を初期化し、姿勢を揃える。
  const ammo = await Ammo.call({}, { locateFile: () => wasm });
  const configuration = new ammo.btSoftBodyRigidBodyCollisionConfiguration();
  const world = new ammo.btSoftRigidDynamicsWorld(
    new ammo.btCollisionDispatcher(configuration),
    new ammo.btDbvtBroadphase(),
    new ammo.btSequentialImpulseConstraintSolver(),
    configuration,
    new ammo.btDefaultSoftBodySolver(),
  );
  const gravity = new ammo.btVector3(0, -620 * SCALE, 0);
  world.setGravity(gravity);
  world.getWorldInfo().set_m_gravity(gravity);
  const position = new Vector3();
  const corners = [
    0,
    CLOTH_COLUMNS,
    initialPose.length / 3 - CLOTH_COLUMNS - 1,
    initialPose.length / 3 - 1,
  ].map((index) => {
    position.fromArray(initialPose, index * 3).multiplyScalar(SCALE);
    return new ammo.btVector3(position.x, position.y, position.z);
  });
  // 最初の2角を固定し、距離制約はCreatePatchが格子全体へ張力として伝える。
  const cloth = new ammo.btSoftBodyHelpers().CreatePatch(
    world.getWorldInfo(),
    corners[0],
    corners[1],
    corners[2],
    corners[3],
    CLOTH_COLUMNS + 1,
    30 + 1,
    3,
    true,
  );
  for (const corner of corners) ammo.destroy(corner);
  const config = cloth.get_m_cfg();
  // 掴んでいる間も伸びを抑える反復数を、ネイティブソルバーへ設定する。
  config.set_piterations(12);
  config.set_viterations(4);
  // 衝撃後の往復運動が続くよう、通常の減衰を適用する。
  config.set_kDP(0.004);
  // 床に触れた頂点の横滑りは、Ammoの摩擦で減らす。
  config.set_kDF(0.2);
  config.set_collisions(0x11);
  const material = cloth.get_m_materials().at(0);
  // 伸びの補正を頂点の逆質量へ分配し、固定点から張力を伝える。
  material.set_m_kLST(0.96);
  // 2頂点先への柔らかい制約で、折れを許しながら鋭すぎるしわを抑える。
  const bending = cloth.appendMaterial();
  bending.set_m_kLST(0.08);
  cloth.generateBendingConstraints(2, bending);
  cloth.setTotalMass(initialPose.length / 3, false);
  cloth.setActivationState(4);
  world.addSoftBody(cloth, 1, -1);
  const transform = new ammo.btTransform();
  transform.setIdentity();
  const floor = new ammo.btStaticPlaneShape(new ammo.btVector3(0, 1, 0), -348 * SCALE);
  const floorInfo = new ammo.btRigidBodyConstructionInfo(
    0,
    new ammo.btDefaultMotionState(transform),
    floor,
  );
  world.addRigidBody(new ammo.btRigidBody(floorInfo));
  // Ammoの固定刻みの姿勢を、描画用のピクセル座標へまとめて受け取る。
  const nodes = Array.from({ length: initialPose.length / 3 }, (_, index) =>
    cloth.get_m_nodes().at(index),
  );
  const positions = initialPose.slice();
  const target = new Vector3();
  const minimum = new Vector3(-480, -348, -240);
  const maximum = new Vector3(480, 300, 280);
  const force = new ammo.btVector3();
  let grabbed = -1;
  let time = 0;

  /** 秒単位の経過時間を固定刻みで進め、描画用の姿勢を更新する。 */
  function update(elapsed: number, strength: number) {
    // 布の時間更新とポインター操作を、同じ物理状態へ反映する。
    // 表示中の物理時間へ、GSAPの風圧と自然な強弱を重ねる。
    time += elapsed;
    const windX = Math.sin(time * 0.4) * 64;
    const windZ = 240 + Math.sin(time * 0.6) * 160 + Math.sin(time * 1.4) * 80;
    nodes.forEach((node, index) => {
      const point = node.get_m_x();
      // 風の到達位置をずらした力を加え、裾の波は布の張力と慣性で生じさせる。
      const gust = Math.sin(time * 2 - point.x() * 0.4 + point.y() * 0.8) * 96;
      force.setValue(windX * strength * SCALE, 0, (windZ + gust) * strength * SCALE);
      cloth.addForce(force, index);
    });
    // 制約と床衝突の反復順序は、Ammoのソルバーへ任せる。
    // 固定刻みの結果を描画フレームへ渡し、頂点ごとの中間状態を揃える。
    world.stepSimulation(elapsed, 8, STEP);
    nodes.forEach((node, index) => {
      const point = node.get_m_x();
      position
        .set(point.x(), point.y(), point.z())
        .divideScalar(SCALE)
        .toArray(positions, index * 3);
    });
  }

  /** 固定点以外の頂点を掴み、周囲へ張力を伝える。 */
  function grab(index: number, point: ClothPoint) {
    releaseGrab();
    if (!nodes[index].get_m_im()) return false;
    grabbed = index;
    // 掴む点の逆質量を固定し、周囲へ張力を伝えて格子全体の伸びを調整する。
    nodes[index].set_m_im(0);
    moveGrab(point);
    return true;
  }

  /** 物理空間でのドラッグ目標を、布が届く範囲へ収める。 */
  function moveGrab(point: ClothPoint) {
    target.copy(point).clamp(minimum, maximum);
    // 同期した物理状態へ直接反映し、同じフレームで離した位置も保持する。
    nodes[grabbed].get_m_x().setValue(target.x * SCALE, target.y * SCALE, target.z * SCALE);
  }

  /** 最後のドラッグ位置を保持し、掴んでいた点を離す。 */
  function releaseGrab() {
    if (grabbed >= 0) {
      // 掴んでいた点の速度を揃え、停止した状態で離す。
      nodes[grabbed].set_m_im(1);
      nodes[grabbed].get_m_v().setValue(0, 0, 0);
    }
    grabbed = -1;
  }

  return { positions, update, grab, moveGrab, releaseGrab } as const;
}
