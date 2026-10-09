import { Container, Graphics, Matrix, RenderLayer, Sprite, Texture } from "pixi.js";
import gsap from "gsap";
import { splitPolygon, type Vertex } from "./splitPolygon";

const SHOT_COUNT = 48;
const MAX_PIECES = 512;
// 火花の重なりで断片の輪郭を隠さず、レーザー線を主役にする。
const MAX_SPARKS = 128;
const SPARK_DRAG = 6;
const IMPACTS: Partial<Record<number, number>> = { 1: 16, 16: 20, 40: 24 };
type Piece = { vertices: Vertex[]; mesh: Graphics; texture: Texture; target: Vertex };

/** 標準Graphicsと発光SpriteでHTMLを切断し、全断片が消えるまでの演出を作る。 */
export function createLaserScene(light: Texture, warmLight: Texture) {
  const view = new Container();
  const paper = new Container();
  const lights = new Container();
  // 通常合成の芯を最後にまとめ、火花ごとの合成切り替えを避ける。
  const sparkCores = new RenderLayer();
  const timeline = gsap.timeline({ paused: true });
  const sparks = new Set<Container>();
  let pieces: Piece[] = [];
  let width = 0;
  let height = 0;
  view.addChild(paper, lights, sparkCores);

  function createGlow(
    texture: Texture,
    length: number,
    thickness: number,
    anchor = 0.5,
    spark = false,
  ) {
    const glow = new Container();
    // 芯の太さと光彩を分け、細い線でも白い輝点と色の残光を保つ。
    const halo = new Sprite({
      texture,
      anchor: { x: anchor, y: 0.5 },
      tint: texture === warmLight ? 0xff8030 : 0x607cff,
      blendMode: "add",
    });
    const core = new Sprite({
      texture: Texture.WHITE,
      anchor: { x: anchor, y: 0.5 },
      // 白い誌面でも火花の芯を残し、光彩だけを加算する。
      tint: spark ? (texture === warmLight ? 0xff8030 : 0x607cff) : 0xffffff,
      blendMode: spark ? "normal" : "add",
    });
    halo.setSize(length + thickness * 8, thickness * 12);
    core.setSize(length, thickness);
    glow.addChild(halo, core);
    // 親の移動と明るさは保ち、破棄時のレイヤー解除はPixiJSへ任せる。
    if (spark) sparkCores.attach(core);
    return glow;
  }

  function createPiece(vertices: Vertex[], texture: Texture): Piece {
    // 三角形分割とUV生成はPixiJSへ任せ、元HTMLの原点と寸法だけ指定する。
    const matrix = new Matrix().scale(width / texture.width, height / texture.height);
    matrix.translate(-width / 2, -height / 2);
    const mesh = new Graphics().setFillStyle({ texture, matrix, textureSpace: "global" });
    mesh.poly(vertices).fill();
    paper.addChild(mesh);
    return { vertices, mesh, texture, target: { x: 0, y: 0 } };
  }

  function removePiece({ mesh }: Piece) {
    gsap.killTweensOf(mesh.position);
    mesh.destroy();
  }

  function clear() {
    for (const piece of pieces) removePiece(piece);
    pieces = [];
    for (const child of lights.removeChildren()) child.destroy({ children: true });
    sparks.clear();
  }

  function emitSparks(start: Vertex, end: Vertex, direction: Vertex, at: number) {
    const length = Math.hypot(end.x - start.x, end.y - start.y);
    const count = Math.min(4, Math.ceil(length / 48));
    for (let index = 0; index < count && sparks.size < MAX_SPARKS; index++) {
      const distance = Math.random();
      const streak = Math.random() < 0.4;
      const speed = streak ? 480 + Math.random() * 480 : 160 + Math.random() * 320;
      const drift = (Math.random() - 0.5) * speed * 0.2;
      // 断面の頂点順に左右されず、ビームの進行方向へ細い火花を流す。
      const vx = direction.x * speed - direction.y * drift;
      const vy = direction.y * speed + direction.x * drift;
      const x = start.x + (end.x - start.x) * distance;
      const y = start.y + (end.y - start.y) * distance;
      const life = 0.8 + Math.random() * 0.24;
      // 芯と光彩を線より小さくし、白地と暗い断面の両方で火花を見せる。
      const spark = createGlow(
        Math.random() < 0.24 ? warmLight : light,
        streak ? speed * 0.008 : 2,
        0.8,
        1,
        true,
      );
      spark.alpha = 0.4;
      spark.position.set(x, y);
      spark.rotation = Math.atan2(vy, vx);
      sparks.add(spark);
      lights.addChild(spark);
      // 向きを保って減速し、細い残光の間に短い微粒子を残す。
      const decay = Math.exp(-SPARK_DRAG * life);
      const flight = gsap.timeline({
        defaults: { duration: life },
        onComplete() {
          sparks.delete(spark);
          spark.destroy({ children: true });
        },
      });
      flight
        .to(spark, {
          x: x + (vx * (1 - decay)) / SPARK_DRAG,
          y: y + (vy * (1 - decay)) / SPARK_DRAG,
          ease: (progress) => (1 - Math.exp(-SPARK_DRAG * life * progress)) / (1 - decay),
        })
        // 減速しても芯は潰さず、最後のフェードまで微粒子を保つ。
        .to(spark.scale, { x: streak ? 0.4 : 1, ease: "expo.out" }, 0)
        // 減速して残る時間を見せ、明るさは後半に落とす。
        .to(spark, { alpha: 0, ease: "power2.in" }, 0);
      timeline.add(flight, at);
    }
  }

  function slice(start: Vertex, end: Vertex, at: number) {
    const length = Math.hypot(end.x - start.x, end.y - start.y);
    const direction = { x: (end.x - start.x) / length, y: (end.y - start.y) / length };
    const nx = -direction.y;
    const ny = direction.x;
    let count = pieces.length;
    pieces = pieces.flatMap((piece) => {
      const { mesh } = piece;
      if (count >= MAX_PIECES) return [piece];
      // 移動した断片の座標へ切断線を戻す。頂点のUVは元のHTMLに対応したまま。
      const halves = splitPolygon(
        piece.vertices,
        { x: start.x - mesh.x, y: start.y - mesh.y },
        { x: end.x - mesh.x, y: end.y - mesh.y },
      );
      if (!halves) return [piece];
      count++;
      const seam = halves[0].filter(
        ({ x, y }) => Math.abs((x + mesh.x - start.x) * nx + (y + mesh.y - start.y) * ny) < 0.002,
      );
      emitSparks(
        { x: seam[0].x + mesh.x, y: seam[0].y + mesh.y },
        { x: seam[seam.length - 1].x + mesh.x, y: seam[seam.length - 1].y + mesh.y },
        direction,
        at,
      );
      const force = pieces.length < 8 ? 80 + Math.random() * 40 : 20 + Math.random() * 20;
      const fragments = halves.map((vertices, side) => {
        const fragment = createPiece(vertices, piece.texture);
        const distance = side === 0 ? force : -force;
        fragment.mesh.position.copyFrom(mesh.position);
        fragment.target = { x: piece.target.x + nx * distance, y: piece.target.y + ny * distance };
        timeline.to(
          fragment.mesh.position,
          {
            ...fragment.target,
            duration: 0.4,
            ease: "expo.out",
          },
          at,
        );
        return fragment;
      });
      removePiece(piece);
      return fragments;
    });
  }

  function fire(index: number, at: number, onImpact: (strength: number) => void) {
    const angle = Math.random() * Math.PI * 2;
    const reach = Math.hypot(width, height);
    const dx = Math.cos(angle) * reach;
    const dy = Math.sin(angle) * reach;
    const x = (Math.random() - 0.5) * width * 0.8;
    const y = (Math.random() - 0.5) * height * 0.8;
    const start = { x: x - dx, y: y - dy };
    const end = { x: x + dx, y: y + dy };
    const line = new Container({ x: start.x, y: start.y, rotation: angle, visible: false });
    const texture = Math.random() < 0.16 ? warmLight : light;
    const beam = createGlow(texture, reach * 2, 2, 0);
    const head = createGlow(texture, 4, 2);
    beam.scale.x = 0;
    line.addChild(beam, head);
    lights.addChild(line);
    timeline
      .set(line, { visible: true }, at)
      .to(beam.scale, { x: 1, duration: 0.08, ease: "none" }, at)
      .to(head, { x: reach * 2, duration: 0.08, ease: "none" }, at)
      .to(head, { alpha: 0, duration: 0.08 }, at + 0.08)
      .to(beam, { alpha: 0, duration: 0.24, ease: "power2.out" }, at + 0.08)
      .call(
        () => {
          slice(start, end, at + 0.08);
          // 48発を3回の衝撃にまとめ、個々の線ではカメラを揺らさない。
          const strength = IMPACTS[index + 1];
          if (strength) onImpact(strength);
        },
        [],
        at + 0.08,
      )
      .call(() => line.destroy({ children: true }), [], at + 0.32);
  }

  function cut(texture: Texture, onImpact: (strength: number) => void) {
    // DPRを保った表示領域の寸法を使い、スクロール中の誌面をそのまま切る。
    width = texture.width / devicePixelRatio;
    height = texture.height / devicePixelRatio;
    view.scale.set(1);
    timeline.clear().pause(0);
    clear();
    pieces = [
      createPiece(
        [
          { x: -width / 2, y: -height / 2 },
          { x: width / 2, y: -height / 2 },
          { x: width / 2, y: height / 2 },
          { x: -width / 2, y: height / 2 },
        ],
        texture,
      ),
    ];
    for (let index = 0; index < SHOT_COUNT; index++) {
      const at = index === 0 ? 0 : Math.sqrt((index + Math.random() * 0.8) / SHOT_COUNT) * 1.2;
      fire(index, at, onImpact);
    }
    // 断面が離れた余韻を残してから、縮小・個別フェードをせず同じ瞬間に消す。
    timeline.call(clear, [], 2.4);
    return timeline;
  }

  function dispose() {
    timeline.kill();
    clear();
    view.destroy({ children: true });
  }

  function resize(nextWidth: number, nextHeight: number) {
    // 切断途中でも全領域へ追従し、ポリゴンを作り直して演出を巻き戻さない。
    view.scale.set(nextWidth / width, nextHeight / height);
  }

  return { view, cut, resize, dispose };
}
