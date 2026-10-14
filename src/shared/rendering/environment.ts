import * as THREE from "three/webgpu";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

/** 室内光を一度だけ焼き込み、生成に使ったシーンとPMREMを解放する。 */
export function createEnvironment(renderer: THREE.Renderer, size: number) {
  const room = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(room, 0, 0.1, 100, { size });
  pmrem.dispose();
  room.dispose();
  return environment;
}
