import { useRef } from "react";
import { useCanvasScene } from "./useCanvasScene";
import { Poster } from "../poster/Poster";
import { createSurfaceEngine } from "./SurfaceEngine";
import { HTMLTexture } from "./HTMLTexture";
import "./canvas.css";

/** HTMLポスターを物理演算する布として描画する。 */
export default function CanvasStage() {
  const canvas = useRef<HTMLCanvasElement>(null);

  const [host] = useCanvasScene(async (element, ready) => {
    await ready;
    return createSurfaceEngine(element, canvas.current!);
  });

  return (
    <main className="experiment canvas-stage">
      <div className="canvas-host" ref={host} />
      <HTMLTexture ref={canvas}>
        <Poster />
      </HTMLTexture>
    </main>
  );
}
