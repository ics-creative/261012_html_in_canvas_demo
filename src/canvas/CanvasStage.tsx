import { useRef } from "react";
import { useCanvasScene } from "./useCanvasScene";
import { Poster } from "../poster/Poster";
import { createSurfaceEngine } from "./SurfaceEngine";
import { HTMLTexture } from "./HTMLTexture";
import "./canvas.css";

/** HTMLポスターを物理演算する布として描画する。 */
export function CanvasStage() {
  const canvas = useRef<HTMLCanvasElement>(null);

  const [host] = useCanvasScene(async (element, signal, ready) => {
    await ready;
    signal.throwIfAborted();
    return createSurfaceEngine(element, canvas.current!, signal);
  });

  return (
    <main className="experiment">
      <section className="canvas-stage">
        <div className="canvas-host" ref={host} />
        <HTMLTexture ref={canvas}>
          <Poster />
        </HTMLTexture>
      </section>
    </main>
  );
}
