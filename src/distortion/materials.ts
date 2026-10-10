import * as THREE from "three/webgpu";
import * as TSL from "three/tsl";
import { gaussianBlur } from "three/addons/tsl/display/GaussianBlurNode.js";

/** 下から上へ進む斜めの波で、背景の写真を切り替える。 */
export function createBackgroundNode(from: THREE.Texture, to: THREE.Texture) {
  const motion = {
    fromMap: TSL.texture(from),
    toMap: TSL.texture(to),
    progress: TSL.uniform(0),
    direction: TSL.uniform(1),
    coverScale: TSL.uniform(new THREE.Vector2(1, 1)),
  };
  const { fromMap, toMap, progress, direction, coverScale } = motion;
  const coord = TSL.screenUV.flipY();
  const strength = progress.mul(Math.PI).sin();
  const side = TSL.mix(coord.x.oneMinus(), coord.x, direction.step(0));
  const diagonal = coord.y.mul(0.8).add(side.mul(0.2));
  const across = side.mul(0.8).sub(coord.y.mul(0.2));
  const ripple = across
    .mul(12)
    .sub(progress.mul(6))
    .sin()
    .mul(0.1)
    .add(across.mul(28).add(diagonal.mul(8)).add(progress.mul(4)).sin().mul(0.02));
  const edge = progress.mul(1.6).sub(0.2).sub(diagonal).add(ripple.mul(strength));
  const front = edge.mul(edge).mul(-28).exp().mul(strength);
  const drift = TSL.vec2(direction.mul(-0.2), 1).normalize();
  const tangent = TSL.vec2(drift.y, drift.x.negate());
  // 写真の揺らぎを先に求め、入退場の歪みへ同じ向きで加える。
  const fromSway = across.mul(18).sub(progress.mul(8)).sin().mul(0.02);
  const toSway = across.mul(14).add(progress.mul(6)).add(2).sin().mul(0.04);
  const centered = coord.sub(0.5);
  const fromUV = centered
    .mul(front.mul(0.16).oneMinus())
    .add(0.5)
    .add(drift.mul(front).mul(0.16))
    .add(tangent.mul(front).mul(fromSway));
  const toUV = centered
    .mul(front.mul(0.12).oneMinus())
    .add(0.5)
    .sub(drift.mul(front).mul(0.08))
    .add(tangent.mul(front).mul(toSway));
  const color = TSL.mix(
    fromMap.sample(fromUV.sub(0.5).mul(coverScale).add(0.5)),
    toMap.sample(toUV.sub(0.5).mul(coverScale).add(0.5)),
    edge.smoothstep(-0.12, 0.12),
  );
  return { color, motion };
}

/** 静的な風の勾配を一度描き、各文字面で共有する。 */
export function createFlowField() {
  const field = TSL.uv().mul(16).sub(4);
  const noise = (x: number, y: number) => TSL.mx_noise_float(field.add(TSL.vec2(x, y)));
  const curl = TSL.vec2(
    noise(0, 0.04).sub(noise(0, -0.04)),
    noise(-0.04, 0).sub(noise(0.04, 0)),
  ).div(0.08);
  // ノイズ画像を全頂点・全フレームで共有し、滑らかに補間して読む。
  return TSL.rtt(TSL.vec4(curl, 0, 1), 256, 256, { autoUpdate: false, depthBuffer: false });
}

/** HTML面の各点を流速場へ流し、文字の輪郭ごと引き伸ばす。 */
export function createForegroundMaterial(
  map: THREE.HTMLTexture,
  height: number,
  flow: ReturnType<typeof createFlowField>,
) {
  const motion = {
    entry: TSL.uniform(new THREE.Vector2()),
    exit: TSL.uniform(new THREE.Vector2()),
    wind: TSL.uniform(new THREE.Vector2(-0.6, 1).normalize()),
    seed: TSL.uniform(0),
  };
  const { entry, exit, wind, seed } = motion;
  // 見出しと説明文の間の空白で進捗をつなぎ、HTML面全体を流す。
  const heading = TSL.uv().y.smoothstep(0.46, 0.5);
  const arrival = TSL.mix(entry.y, entry.x, heading);
  const departure = TSL.mix(exit.y, exit.x, heading);
  const distance = departure.mul(0.8).sub(arrival.oneMinus().mul(0.6));
  const displaced = TSL.Fn(() => {
    const point = TSL.positionLocal.xy.div(height).toVar();
    // ノイズの勾配に直交する流れを積分し、各点の位置を更新する。
    // 隣り合う点の流速差で、文字の太さ・輪郭を粘性のある筋へ伸ばす。
    TSL.Loop(8, () => {
      const field = point.mul(1.6).add(seed.mul(8));
      const curl = flow.sample(field.add(4).div(16)).xy;
      const across = TSL.vec2(wind.y, wind.x.negate());
      // 渦の横方向は残し、流れに沿う速さは正に保って右下→左上へ運ぶ。
      // 移動距離を保ち、流速差と横の渦を弱めて文字の輪郭を整える。
      const along = curl.dot(wind).mul(0.08).clamp(-0.08, 0.08).add(1);
      const velocity = wind.mul(along).add(across.mul(curl.dot(across)).mul(0.2));
      point.addAssign(velocity.mul(distance.div(8)));
    });
    return point.mul(height);
  })();
  const image = TSL.texture(map);
  // ぼかす中間画像だけを縮小する。元HTMLと表示Canvasの解像度は保つ。
  const source = TSL.rtt(image, map.image.offsetWidth / 4, map.image.offsetHeight / 4, {
    autoUpdate: false,
    depthBuffer: false,
  });
  // 退場の前半は輪郭を残し、後半だけ風向きへ溶かす。静止位置では必ずゼロになる。
  const melting = TSL.max(
    departure.smoothstep(0.32, 0.84),
    arrival.oneMinus().smoothstep(0.08, 0.8),
  );
  const radius = melting.mul(devicePixelRatio);
  // 中間画像の面積を減らし、広いカーネルで輪郭を滑らかにぼかす。
  // RGBとアルファを同じ重みでぼかし、乗算済みの色を通常合成する。
  const blur = gaussianBlur(source, radius, 16, {
    premultipliedAlpha: true,
  });
  // 静止時は原寸のHTMLを読み、着地した文字の解像度へ戻す。
  const pixel = TSL.mix(image, blur, melting.smoothstep(0, 0.16));
  // 面ごとの移動に合わせ、退場と入場それぞれのぼかしを制御する。
  const material = new THREE.MeshBasicNodeMaterial({
    side: THREE.DoubleSide,
    forceSinglePass: true,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    colorNode: pixel.rgb,
    positionNode: TSL.vec3(displaced, 0),
    opacityNode: pixel.a
      .mul(arrival.smoothstep(0, 0.16))
      .mul(departure.smoothstep(0.64, 1).oneMinus()),
  });
  return { material, motion, image, source, blur };
}
