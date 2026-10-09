import { useRef, useState } from "react";
import { PageNavigation } from "../app/Navigation";
import { useCanvasScene } from "../canvas/useCanvasScene";
import { BookPage, pageCount, pageHeight, pageWidth } from "./BookPage";
import type { HitCanvas } from "../canvas/HTMLHitTarget";
import { createBookScene } from "./BookScene";
import "./book.css";

/** 英語のHTML誌面を選択・コピーできる、ページめくり付きの3D写真集。 */
export function BookDemo() {
  const canvasRef = useRef<HitCanvas>(null);
  const [navigation, setNavigation] = useState({ spread: 0, turning: false });
  const [host, scene] = useCanvasScene((element, signal, ready) =>
    createBookScene(element, canvasRef.current!, signal, ready, (spread, turning) =>
      setNavigation({ spread, turning }),
    ),
  );

  return (
    <main className="experiment" lang="en">
      <section className="book-stage">
        <div ref={host} className="book-host">
          <canvas ref={canvasRef} {...{ content: "drawable" }}>
            {Array.from({ length: pageCount }, (_, index) => (
              <div
                key={index}

                style={{ width: pageWidth, height: pageHeight }}
                {...{ drawable: "" }}
              >
                <BookPage index={index} />
              </div>
            ))}
          </canvas>
        </div>
        {scene && (
          <PageNavigation
            className="book-navigation"
            disabled={(direction) =>
              navigation.turning || navigation.spread === (direction < 0 ? 0 : pageCount / 2 - 1)
            }
            onGo={scene.turnPage}
          />
        )}
      </section>
    </main>
  );
}
