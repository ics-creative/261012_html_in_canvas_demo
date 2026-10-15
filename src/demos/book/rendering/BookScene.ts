import * as THREE from "three/webgpu";
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { pageCount, pageHeight, pageWidth } from "../components/BookPage";
import {
  createHtmlHitTarget,
  type HitCanvas,
  type HtmlPoint,
} from "../../../shared/rendering/HtmlHitTarget";
import { createCanvasTextures } from "../../../shared/rendering/textures";
import { createPageSheet, createPaperMaterial, sheetWidth } from "./PageSheet";
import { createBookWorld } from "./BookWorld";
import { createOrbit, createPointerRay, fitOrbit } from "../../../shared/rendering/orbit";
import { createRenderer } from "../../../shared/rendering/renderer";
import { loadSceneAsset } from "../../../shared/rendering/sceneAsset";

gsap.registerPlugin(CustomEase);
// 紙が持ち上がる立ち上がりを短くし、反対側へ降りる時間を長く取る。
const pageTurnEase = CustomEase.create("book-page-turn", "0.24,0,0.12,1");

/** HTML誌面をpaintと同期し、本の描画・選択・ページめくりを開始する。 */
export async function createBookScene(
  host: HTMLElement,
  canvas: HitCanvas,
  onChange: (spread: number, turning: boolean) => void,
) {
  // シーン素材・紙の繊維・GPUを、並列で読み込む。
  const [renderer, scene, paperGrain] = await Promise.all([
    createRenderer(host, canvas),
    loadSceneAsset("images/book/scene.json"),
    new THREE.TextureLoader().loadAsync("images/book/paper-grain.png"),
  ]);

  // シーン素材は天板・表紙・紙束の静的形状と照明を保存し、角丸も事前に計算する。
  // 低い斜光で紙の湾曲を照らし、めくる紙の影を下の誌面へ落とす。
  // VSMの深度精度を保つため、光源の描画範囲を本の周囲へ絞る。
  // VSMの二方向ぼかしで投影の縁を柔らかくし、接地の濃さはGTAOで残す。
  // 天板の上面を本の底へ合わせ、有限の厚みと丸い端部を見せる。
  // 木目の法線と表紙の布目を強め、マットなウォールナットの質感をつける。
  // 背は紙の綴じ目の下へ納め、表紙に続く本の輪郭をつくる。
  const { camera, book, stacks } = createBookWorld(renderer, scene);
  // 縮小しても残る繊維の凹凸と漉きむら、布の織り目は静的素材を全誌面で共有する。
  // 凹凸と粗さのグレースケール素材は、読み込んだ数値をそのまま使う。
  paperGrain.wrapS = paperGrain.wrapT = THREE.RepeatWrapping;
  paperGrain.repeat.set(2, 2);
  paperGrain.flipY = false;
  paperGrain.anisotropy = 8;
  const { textures: pages, painted } = createCanvasTextures([canvas], renderer);
  const hitTarget = createHtmlHitTarget(
    canvas,
    pages.map((page) => page.image),
    camera,
    { width: pageWidth, height: pageHeight },
  );
  const paper = createPaperMaterial(paperGrain);
  const left = createPageSheet(paper, pages[0]);
  const right = createPageSheet(paper, pages[1]);
  const turning = createPageSheet(paper, pages[0]);
  book.add(left.mesh, right.mesh, turning.mesh);
  const aim = createPointerRay(camera, canvas);
  const press = new THREE.Vector2();
  let spread = 0;
  const turn = { spread: 0, progress: 0 };

  const orbit = createOrbit(camera, host);
  orbit.target.set(0, 0.6, 0);
  orbit.rotateSpeed = 0.6;
  orbit.minPolarAngle = 0.06;
  orbit.maxPolarAngle = Math.PI / 2 - 0.04;
  orbit.mouseButtons.RIGHT = undefined;
  orbit.addEventListener("change", hitTarget.hide);
  canvas.tabIndex = 0;
  for (const type of ["pointerdown", "contextmenu"] as const) {
    host.addEventListener(type, preserveNativeAction, { capture: true });
  }
  host.addEventListener("pointermove", pointerMove, { capture: true });
  host.addEventListener("pointerup", (event) => {
    // 文字をドラッグした終点を補正し、クリック時の単語選択はブラウザーへ渡す。
    if (event.button === 0 && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 4) {
      hitTarget.finish(pageHit(event), event);
    }
  });
  host.addEventListener("pointerleave", hitTarget.hide);
  host.addEventListener("keydown", keyDown);
  setSpread();
  fitOrbit(renderer, host, camera, orbit, {
    width: sheetWidth * 2.4 * 1.08,
    height: 8 * 1.08,
    zoom: [0.4, 2],
    position: (distance) => camera.position.set(distance * 0.04, distance * 0.8, distance * 0.6),
  });

  function setSpread(leftSpread = spread, rightSpread = spread) {
    [left, right].forEach((sheet, side) => {
      const index = side ? rightSpread : leftSpread;
      // 表は右、裏は左の誌面。別画像でGPUの表裏の参照を独立させる。
      sheet.setTextures(pages[index * 2 + 1], pages[index * 2]);
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
    hitTarget.clear();
    hitTarget.hide();
    turn.spread = Math.min(spread, next);
    turn.progress = direction === 1 ? 0 : 1;
    turning.setTextures(pages[turn.spread * 2 + 1], pages[turn.spread * 2 + 2]);
    setSpread(turn.spread, turn.spread + 1);
    poseTurn();
    gsap.to(turn, {
      progress: 1 - turn.progress,
      duration: 1.2,
      ease: pageTurnEase,
      onUpdate: poseTurn,
      onComplete: () => {
        spread = next;
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
    turning.pose(turn.progress, height, 0.4);
  }

  function pageHit(event: Pick<MouseEvent, "clientX" | "clientY">): HtmlPoint | null {
    if (turning.mesh.visible) return null;
    const hit = aim(event).intersectObjects<THREE.Mesh>([left.mesh, right.mesh], false)[0];
    if (!hit?.uv || !hit.face) return null;
    const isLeft = hit.object === left.mesh;
    if (isLeft) hit.uv.x = 1 - hit.uv.x;
    return {
      index: spread * 2 + Number(!isLeft),
      x: hit.uv.x * pageWidth,
      y: (1 - hit.uv.y) * pageHeight,
      mesh: hit.object,
      triangle: [hit.face.a, hit.face.b, hit.face.c],
      flipX: isLeft,
    };
  }

  function pointerMove(event: PointerEvent) {
    const hit = pageHit(event);
    hitTarget.move(hit, event);
    host.style.cursor = hit ? "auto" : "grab";
  }

  function preserveNativeAction(event: MouseEvent) {
    const hit = pageHit(event);
    hitTarget.move(hit, event);
    if (event.type === "pointerdown") {
      press.set(event.clientX, event.clientY);
      if (hit && event.button === 0) canvas.focus({ preventScroll: true });
    }
    // 誌面上の操作を標準の選択・右クリックへ渡し、カメラは背景で回す。
    if (hit || event.type === "contextmenu") event.stopImmediatePropagation();
  }

  function keyDown(event: KeyboardEvent) {
    if (turning.mesh.visible) return;
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "a") {
      event.preventDefault();
      hitTarget.selectAll(spread * 2, spread * 2 + 1);
    } else if (event.key === "Escape") hitTarget.clear();
  }

  // HTML誌面の初回描画を待ち、本のページへ映す。
  await painted;
  // めくる紙も同じシェーダーを使うため、初回は表示中の見開きだけを描く。
  renderer.render(scene, camera);
  renderer.setAnimationLoop(() => {
    orbit.update();
    renderer.render(scene, camera);
  });
  return { turnPage };
}

function heights(spread: number) {
  // 紙幅4に対して一枚0.004とし、めくるたびに薄い紙一枚分だけ左右へ移す。
  return { left: 0.2 + spread * 0.004, right: 0.2 + (pageCount / 2 - 1 - spread) * 0.004 };
}
