import { Vector2, Vector3 } from "three";

/** 物理空間の三次元座標。 */
export type ClothPoint = Pick<Vector3, "x" | "y" | "z">;

/** 物理格子の横分割数。両端の固定点を描画側とも共有する。 */
export const CLOTH_COLUMNS = 48;

type Particle = Vector3 & {
  previous: Vector3;
  frame: Vector3;
  rest: Vector2;
  weight: number;
  tethers: number[];
};
type Constraint = { a: Particle; b: Particle; length: number; alpha: number; lambda: number };

// 布のドラッグ・重力・風圧を固定刻みで解き、フレームレートによる差を抑える。
const STEP = 1 / 120;
const WIDTH = 760;
const HEIGHT = 480;

function constrain(target: Vector3, anchor: Vector3, limit: number) {
  const scale = limit / target.distanceTo(anchor);
  if (scale < 1) target.sub(anchor).multiplyScalar(scale).add(anchor);
}

/** XPBDで布の伸び・曲げ・床との衝突を解く。 */
export function createClothPhysics(initialPose: Float32Array) {
  const columns = CLOTH_COLUMNS;
  const rows = 30;
  const floorY = -350;
  const stride = columns + 1;
  const interpolatedPositions = initialPose.slice();
  const corner = new Vector2(WIDTH, 0);
  const particles: Particle[] = Array.from({ length: initialPose.length / 3 }, (_, index) => {
    const position = new Vector3().fromArray(initialPose, index * 3);
    const rest = new Vector2(
      ((index % stride) * WIDTH) / columns,
      (Math.floor(index / stride) * HEIGHT) / rows,
    );
    return Object.assign(position, {
      previous: position.clone(),
      frame: position.clone(),
      rest,
      weight: index === 0 || index === columns ? 0 : 1,
      tethers: [rest.length() * 1.008, rest.distanceTo(corner) * 1.008, 0],
    });
  });
  const anchors = [particles[0], particles[columns]];
  const target = new Vector3();
  const delta = new Vector3();
  const minimum = new Vector3(-480, floorY + 2, -240);
  const maximum = new Vector3(480, 300, 280);
  let accumulator = 0;
  let time = 0;
  let wind = 0;
  let releasePending = false;
  // 初期静定の強い減衰を持ち込まず、衝撃後の往復運動を残す。
  const damping = Math.exp(-0.4 * STEP);
  const constraints: Constraint[] = [];
  const add = (a: number, b: number, length: number, softness: number) => {
    constraints.push({
      a: particles[a],
      b: particles[b],
      length,
      alpha: softness / (STEP * STEP),
      lambda: 0,
    });
  };
  const spacingX = WIDTH / columns;
  const spacingY = HEIGHT / rows;
  particles.forEach(({ rest }, index) => {
    if (rest.x < WIDTH) add(index, index + 1, spacingX, 2e-7);
    if (rest.y < HEIGHT) add(index, index + stride, spacingY, 2e-7);
  });
  particles.forEach(({ rest }, index) => {
    if (rest.x < WIDTH && rest.y < HEIGHT) {
      add(index, index + stride + 1, Math.hypot(spacingX, spacingY), 8e-7);
      add(index + 1, index + stride, Math.hypot(spacingX, spacingY), 8e-7);
    }
    // 2頂点先への柔らかい制約で、折れを許しながら鋭すぎるしわを抑える。
    if (rest.x <= WIDTH - spacingX * 2) add(index, index + 2, spacingX * 2, 0.0012);
    if (rest.y <= HEIGHT - spacingY * 2) add(index, index + stride * 2, spacingY * 2, 0.0012);
  });

  /** 秒単位の経過時間を固定刻みで進め、描画用の中間姿勢を更新する。 */
  function update(elapsed: number, strength: number) {
    wind = strength;
    accumulator += elapsed;
    while (accumulator + 1e-10 >= STEP) {
      // 導入の静止時間を含めず、表示中の物理時間だけ進める。
      time += STEP;
      step();
      if (releasePending) releaseGrab(true);
      accumulator -= STEP;
    }
    // 固定刻みの前後を補間し、高リフレッシュレートでも同じ姿勢を連続表示しない。
    particles.forEach((particle, index) => {
      delta
        .lerpVectors(particle.frame, particle, accumulator / STEP)
        .toArray(interpolatedPositions, index * 3);
    });
  }

  /** 固定点以外の頂点を掴み、周囲へ張力を伝える距離制約を作る。 */
  function grab(index: number, point: ClothPoint) {
    releaseGrab(true);
    const particle = particles[index];
    if (!particle.weight) return false;
    particle.weight = 0;
    anchors.push(particle);
    for (const next of particles) next.tethers[2] = next.rest.distanceTo(particle.rest) * 1.008;
    moveGrab(point);
    return true;
  }

  /** 物理空間でのドラッグ目標を、布が届く範囲へ収める。 */
  function moveGrab(point: ClothPoint) {
    target.copy(point).clamp(minimum, maximum);
    for (let iteration = 0; iteration < 12; iteration++) {
      for (let anchor = 0; anchor < 2; anchor++) {
        constrain(target, anchors[anchor], anchors[2].tethers[anchor]);
      }
    }
  }

  /** 通常は最後の入力を次の物理更新へ反映してから離し、キャンセル時は即座に離す。 */
  function releaseGrab(immediate = false) {
    if (!immediate && anchors.length > 2) {
      releasePending = true;
      return;
    }
    releasePending = false;
    const grabbed = anchors[2];
    if (grabbed) {
      grabbed.weight = 1;
      // 離した瞬間の入力速度をそのまま巨大な加速度に変えない。
      grabbed.previous.copy(grabbed);
    }
    anchors.length = 2;
  }

  function step() {
    // GSAPの風圧に自然な強弱を重ね、波は布の張力と慣性で生じさせる。
    const windStep = wind * STEP * STEP;
    const windX = Math.sin(time * 0.4) * 64;
    const windZ = 240 + Math.sin(time * 0.6) * 160 + Math.sin(time * 1.4) * 80;
    const grabbed = anchors[2];
    for (const position of particles) {
      position.frame.copy(position);
      const { previous, weight } = position;
      if (!weight) continue;
      delta.subVectors(position, previous);
      previous.copy(position);
      position.addScaledVector(delta, damping);
      position.y -= 620 * STEP * STEP;
      // 風の到達位置をずらした力を加え、裾の波は布の張力と慣性で生じさせる。
      const gust = Math.sin(time * 2 - position.x * 0.004 + position.y * 0.008) * 96;
      position.x += windX * windStep;
      position.z += (windZ + gust) * windStep;
    }

    if (grabbed) grabbed.lerp(target, Math.min(1, (1200 * STEP) / grabbed.distanceTo(target)));
    for (const constraint of constraints) constraint.lambda = 0;
    // 掴んでいる間は反復を増やし、細分化した布の局所的な伸びを抑える。
    const iterations = grabbed ? 12 : 8;
    for (let iteration = 0; iteration < iterations; iteration++) {
      // 解く順序を交互に反転し、片側へ偏った引きつりを防ぐ。
      const forward = iteration % 2 === 0;
      for (let n = 0; n < constraints.length; n++) {
        const constraint = constraints[forward ? n : constraints.length - n - 1];
        const { a, b, length, alpha } = constraint;
        const weight = a.weight + b.weight;
        delta.subVectors(b, a);
        const distance = delta.length();
        if (distance < 1e-8) continue;
        // 伸び量と蓄積した補正量から今回の補正を求め、両端の逆質量で分配する。
        const lambda = (-(distance - length) - alpha * constraint.lambda) / (weight + alpha);
        constraint.lambda += lambda;
        a.addScaledVector(delta, (-lambda * a.weight) / distance);
        b.addScaledVector(delta, (lambda * b.weight) / distance);
      }
      // 固定点からの最大距離を制限し、圧縮やしわを妨げずに張力を伝える。
      for (const position of particles) {
        const { tethers, weight } = position;
        if (!weight) continue;
        for (let anchor = 0; anchor < anchors.length; anchor++) {
          // 掴む点からも張力を伝え、細かい格子の1点だけが伸びるのを防ぐ。
          constrain(position, anchors[anchor], tethers[anchor]);
        }
        position.y = Math.max(floorY + 2, position.y);
      }
    }
    for (const position of particles) {
      const { previous } = position;
      if (position.y <= floorY + 2.001) {
        // 床に触れた頂点だけ、摩擦で横滑りを減らす。
        previous.lerp(position, 0.18);
        previous.y = position.y;
      }
    }
  }

  return {
    interpolatedPositions,
    update,
    grab,
    moveGrab,
    releaseGrab,
  } as const;
}
