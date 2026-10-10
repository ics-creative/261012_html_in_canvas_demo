import * as THREE from "three/webgpu";
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { DragGesture } from "@use-gesture/vanilla";
import { pageCount, pageHeight, pageWidth } from "./BookPage";
import { createHTMLHitTarget, type HitCanvas, type HTMLPoint } from "../canvas/HTMLHitTarget";
import { createCanvasTextures } from "../canvas/textures";
import { createPageSheet, createPaperMaterial, sheetHeight, sheetWidth } from "./PageSheet";
import { createBookWorld } from "./BookWorld";
import { createOrbit, createPointerRay, fitOrbit } from "../canvas/orbit";
import { createRenderer } from "../canvas/renderer";
import { onCleanup, own } from "../canvas/lifecycle";
import { loadSceneAsset } from "../canvas/sceneAsset";

gsap.registerPlugin(CustomEase);
// 紙が持ち上がる立ち上がりを短くし、反対側へ降りる時間を長く取る。
const pageTurnEase = CustomEase.create("book-page-turn", "0.24,0,0.12,1");

/** 誌面とGPUの準備を終えてから、本の描画・選択・ページめくりを開始する。 */
export async function createBookScene(
  host: HTMLElement,
  canvas: HitCanvas,
  signal: AbortSignal,
  ready: Promise<void>,
  onChange: (spread: number, turning: boolean) => void,
) {
  // シーン素材・紙の繊維・GPUは依存しないため、まとめて読み込む。
  const [renderer, scene, paperGrain] = await Promise.all([
    createRenderer(host, signal, canvas),
    loadSceneAsset("images/book/scene.json", signal),
    loadPaperGrain(),
  ]);
  // 初期化中の離脱では、読み込み済みの素材とGPUをsignalで解放する。
  signal.throwIfAborted();
  async function loadPaperGrain() {
    return own(signal, await new THREE.TextureLoader().loadAsync("images/book/paper-grain.png"));
  }

  // シーン素材は天板・表紙・紙束の静的形状と照明を保存し、角丸も事前に計算する。
  // 低い斜光で紙の湾曲を照らし、めくる紙の影を下の誌面へ落とす。
  // VSMの半精度モーメントへ深度が偏らないよう、本を含む範囲まで絞る。
  // VSMの二方向ぼかしで投影の縁を柔らかくし、接地の濃さはGTAOで残す。
  // 天板の上面を本の底へ合わせ、有限の厚みと丸い端部を見せる。
  // 木目の法線と表紙の布目を強め、塗膜を使わないマットなウォールナットにする。
  // 背は紙の綴じ目の下へ納め、金属棒のような円柱の反射を出さない。
  const world = createBookWorld(renderer, scene, signal);
  // フォントと写真を読み終えてからHTMLTextureを作り、後から初期状態を修復しない。
  await ready;
  signal.throwIfAborted();
  // 縮小しても残る繊維の凹凸と漉きむら、布の織り目は静的素材を全誌面で共有する。
  // 凹凸と粗さに使うグレースケール素材には色変換をかけない。
  paperGrain.wrapS = paperGrain.wrapT = THREE.RepeatWrapping;
  paperGrain.repeat.set(2, 2);
  paperGrain.flipY = false;
  paperGrain.anisotropy = 8;
  const { textures: pages, painted } = createCanvasTextures([canvas], renderer, signal);
  const { camera, book, stacks } = world;
  const hitTarget = createHTMLHitTarget(
    canvas,
    pages.map((page) => page.image),
    camera,
    { width: pageWidth, height: pageHeight },
  );
  const paper = own(signal, createPaperMaterial(paperGrain));
  const left = createPageSheet(paper, pages[0]);
  const right = createPageSheet(paper, pages[1]);
  const turning = createPageSheet(paper, pages[0]);
  book.add(left.mesh, right.mesh, turning.mesh);
  const aim = createPointerRay(camera, canvas);
  const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.3);
  const dragPoint = new THREE.Vector3();
  let spread = 0;
  const turn = { spread: 0, progress: 0, corner: 0 };
  let grabbed: ReturnType<typeof pageHit> = null;
  // 指への追従はGSAP、離したときの速度はジェスチャーへ任せ、別の時計や補間を持たない。
  const followDrag = gsap.quickTo(turn, "progress", {
    duration: 0.12,
    ease: "power2.out",
    onUpdate: poseTurn,
  });

  const orbit = createOrbit(camera, host, signal);
  orbit.target.set(0, 0.6, 0);
  orbit.rotateSpeed = 0.6;
  orbit.minPolarAngle = 0.06;
  orbit.maxPolarAngle = Math.PI / 2 - 0.04;
  orbit.mouseButtons.RIGHT = undefined;
  orbit.addEventListener("change", hitTarget.hide);
  canvas.tabIndex = 0;
  for (const type of ["pointerdown", "contextmenu"] as const) {
    host.addEventListener(type, preserveNativeAction, { capture: true, signal });
  }
  host.addEventListener("pointermove", pointerMove, { capture: true, signal });
  host.addEventListener("pointerleave", hitTarget.hide, { signal });
  host.addEventListener("keydown", keyDown, { signal });
  setSpread();
  fitOrbit(renderer, host, camera, orbit, signal, {
    width: sheetWidth * 2.4 * 1.08,
    height: 8 * 1.08,
    zoom: [0.4, 2],
    position: (distance) => camera.position.set(distance * 0.04, distance * 0.8, distance * 0.6),
  });
  const gesture = new DragGesture<PointerEvent>(
    host,
    ({ event, first, last, movement, velocity, direction, tap, canceled }) => {
      if (first) {
        grabbed = pageHit(event);
        orbit.enabled = !grabbed;
        hitTarget.move(grabbed?.text ?? null, event);
        if (grabbed) canvas.focus({ preventScroll: true });
        if (grabbed?.edge) startTurn(grabbed.direction, grabbed.point.z / (sheetHeight * 0.5));
      }
      // 紙端だけをめくり操作にし、誌面の選択・画像操作はブラウザーへ渡す。
      if (grabbed?.edge) {
        event.preventDefault();
        const start = Number(grabbed.direction < 0);
        const progress = THREE.MathUtils.clamp(start + movement[0], 0, 1);
        host.style.cursor = "grabbing";
        if (last) {
          let target = Number(progress > 0.5);
          if (canceled || event.type !== "pointerup") target = start;
          else if (tap) target = 1 - start;
          else if (velocity[0] > 0.0004) target = Number(direction[0] > 0);
          turnTo(target);
        } else followDrag(progress, turn.progress);
      }
      if (last) {
        if (grabbed && !grabbed.edge && !tap && !canceled) {
          hitTarget.finish(pageHit(event)?.text ?? null, event);
        }
        grabbed = null;
        orbit.enabled = true;
        host.style.cursor = "default";
      }
    },
    {
      pointer: { capture: false, keys: false },
      eventOptions: { capture: true, passive: false },
      tapsThreshold: 4,
      transform: ([clientX, clientY]) => {
        if (aim({ clientX, clientY }).ray.intersectPlane(dragPlane, dragPoint)) {
          book.worldToLocal(dragPoint);
        }
        return [-dragPoint.x / (sheetWidth * 2), 0];
      },
    },
  );
  onCleanup(signal, () => {
    gsap.killTweensOf(turn);
    gesture.destroy();
    for (const resource of [left, right, turning]) resource.dispose();
  });

  function setSpread(leftSpread = spread, rightSpread = spread) {
    [left, right].forEach((sheet, side) => {
      const index = side ? rightSpread : leftSpread;
      const texture = pages[index * 2 + side];
      sheet.setTextures(texture);
      const height = side ? heights(index).right : heights(index).left;
      sheet.pose(1 - side, height);
      const thickness = height - 0.12;
      stacks[side].scale.y = thickness;
      stacks[side].position.y = 0.12 + thickness * 0.5;
    });
    turning.mesh.visible = leftSpread !== rightSpread;
    onChange(spread, turning.mesh.visible);
  }

  /** ボタンから隣の見開きへ、立ち上がりと長い減速をつけて送る。 */
  function turnPage(direction: -1 | 1) {
    const next = spread + direction;
    if (turning.mesh.visible || next < 0 || next >= pageCount / 2) return;
    startTurn(direction, 0.4);
    turnTo(direction === 1 ? 1 : 0, true);
  }

  function startTurn(direction: -1 | 1, corner: number) {
    hitTarget.clear();
    hitTarget.hide();
    const turningSpread = direction === 1 ? spread : spread - 1;
    const progress = direction === 1 ? 0 : 1;
    Object.assign(turn, { spread: turningSpread, progress, corner });
    turning.setTextures(pages[turningSpread * 2 + 1], pages[turningSpread * 2 + 2]);
    setSpread(turningSpread, turningSpread + 1);
    poseTurn();
  }

  function turnTo(target: number, fromButton = false) {
    followDrag.tween.pause();
    gsap.to(turn, {
      progress: target,
      // ドラッグを離した位置を引き継ぎ、残りが短いほど早く着地する。
      duration: fromButton ? 1.2 : Math.max(0.4, Math.abs(target - turn.progress) * 1.2),
      ease: fromButton ? pageTurnEase : "expo.out",
      onUpdate: poseTurn,
      onComplete: () => {
        spread = turn.spread + target;
        setSpread();
      },
    });
  }

  function poseTurn() {
    const height = THREE.MathUtils.lerp(
      heights(turn.spread).right,
      heights(turn.spread + 1).left,
      turn.progress,
    );
    // 背を紙束の高さにつなぎ、曲げは紙面の角度だけで作る。
    turning.pose(turn.progress, height, turn.corner);
  }

  function pageHit(event: Pick<MouseEvent, "clientX" | "clientY">) {
    if (turning.mesh.visible) return null;
    const hit = aim(event).intersectObjects<THREE.Mesh>([left.mesh, right.mesh], false)[0];
    if (!hit?.uv || !hit.face) return null;
    const isLeft = hit.object === left.mesh;
    if (isLeft) hit.uv.x = 1 - hit.uv.x;
    const direction: -1 | 1 = isLeft ? -1 : 1;
    const edge = isLeft
      ? hit.uv.x < 0.06 && spread > 0
      : hit.uv.x > 0.94 && spread < pageCount / 2 - 1;
    const text: HTMLPoint = {
      index: spread * 2 + Number(!isLeft),
      x: hit.uv.x * pageWidth,
      y: (1 - hit.uv.y) * pageHeight,
      mesh: hit.object,
      triangle: [hit.face.a, hit.face.b, hit.face.c],
      flipX: isLeft,
    };
    return { point: book.worldToLocal(hit.point), direction, edge, text };
  }

  function pointerMove(event: PointerEvent) {
    if (grabbed?.edge) return;
    const hit = pageHit(event);
    hitTarget.move(hit?.text ?? null, event);
    host.style.cursor = hit ? "auto" : "grab";
  }

  function preserveNativeAction(event: MouseEvent) {
    // OrbitControlsのポインター取得を止め、元HTMLの右クリックを保つ。
    if (event.type === "pointerdown") {
      if (event.button !== 2 && !event.ctrlKey) return;
      hitTarget.move(pageHit(event)?.text ?? null, event);
    }
    // ブラウザーの標準メニューはそのまま開き、OrbitControlsへは渡さない。
    event.stopImmediatePropagation();
  }

  function keyDown(event: KeyboardEvent) {
    if (turning.mesh.visible) return;
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "a") {
      event.preventDefault();
      hitTarget.selectAll(spread * 2, spread * 2 + 1);
    } else if (event.key === "Escape") hitTarget.clear();
  }

  // HTML誌面を描いたフレームを用意してから、共通の画面遷移へ渡す。
  await painted;
  signal.throwIfAborted();
  // めくる紙も同じシェーダーを使うため、初回は表示中の見開きだけを描く。
  world.render();
  renderer.setAnimationLoop(() => {
    if (orbit.enabled) orbit.update();
    world.render();
  });
  return { turnPage };
}

function heights(spread: number) {
  // 紙幅4に対して一枚0.004とし、めくるたびに薄い紙一枚分だけ左右へ移す。
  return { left: 0.2 + spread * 0.004, right: 0.2 + (pageCount / 2 - 1 - spread) * 0.004 };
}
