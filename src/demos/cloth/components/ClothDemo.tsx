import { useRef } from "react";
import { useCanvasScene } from "../../../shared/hooks/useCanvasScene";
import { Poster } from "./Poster";
import { createClothScene } from "../rendering/ClothScene";
import { HtmlTexture } from "../../../shared/components/HtmlTexture";
import "../../../shared/styles/capture.css";
import "../styles/cloth.css";

/** HTMLポスターを物理演算する布として描画する。 */
export default function ClothDemo() {
  const canvas = useRef<HTMLCanvasElement>(null);

  const [host] = useCanvasScene((element) => createClothScene(element, canvas.current!));

  return (
    <main className="experiment canvas-stage">
      <div className="canvas-host" ref={host}></div>
      <HtmlTexture ref={canvas}>
        <Poster />
      </HtmlTexture>
    </main>
  );
}
