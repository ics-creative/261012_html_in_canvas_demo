import { useRef, useState } from "react";
import { PageNavigation } from "../../../shared/components/PageNavigation";
import { useCanvasScene } from "../../../shared/hooks/useCanvasScene";
import { flushSync } from "react-dom";
import { HtmlTexture } from "../../../shared/components/HtmlTexture";
import { createDistortionScene, width, height } from "../rendering/DistortionScene";
import "../../../shared/styles/capture.css";
import "../styles/distortion.css";

const pages = [
  {
    title: "NORMANDY",
    video: "videos/P3253810-60fps.mp4",
    description:
      "Mont Saint-Michel sits above the tidal flats of Normandy. At low tide, the bay opens into wide stretches of sand and shallow water, with clouds moving across the sky.",
  },
  {
    title: "PARIS",
    video: "videos/P3345690.mp4",
    description:
      "The Eiffel Tower overlooks the Seine at sunset. Boats travel along the river as the embankment lights come on, and the warm sky is reflected across the water below the bridges.",
  },
  {
    title: "LOUVRE",
    video: "videos/P3181732-60fps.mp4",
    description:
      "The glass pyramid sits in the Louvre courtyard, framed by ornate stone facades. Visitors move between the entrances as clouds pass overhead and reflect across the glass panels.",
  },
];

function TextPage({ index, inert = false }: { index: number; inert?: boolean }) {
  return (
    <section className="distortion-type" inert={inert}>
      <h2>{pages[index].title}</h2>
      <p>{pages[index].description}</p>
    </section>
  );
}

/** AV1動画とHTMLの文字を、時間差のある風の歪みで切り替えるデモ。 */
export default function DistortionDemo() {
  const stage = useRef<HTMLElement>(null);
  const [current, setCurrent] = useState(0);
  const [scale, setScale] = useState(1);
  const [animating, setAnimating] = useState(false);

  const [host, scene] = useCanvasScene((element) =>
    createDistortionScene(
      element,
      Array.from(stage.current!.querySelectorAll<HTMLCanvasElement>(".capture-staging canvas")),
      Array.from(stage.current!.querySelectorAll("video")),
      setScale,
      () => flushSync(() => setAnimating(true)),
      (index) => {
        // GPUの最終描画後、同じフレーム内で元HTMLへ戻す。
        flushSync(() => {
          setCurrent(index);
          setAnimating(false);
        });
      },
    ),
  );

  return (
    <main ref={stage} className="experiment distortion-stage">
      <div ref={host} className="distortion-host"></div>
      <div
        className={`distortion-document ${animating ? "is-transitioning" : ""}`}
        style={{
          transform: `translate(-50%, -50%) scale(${scale})`,
        }}
      >
        <TextPage index={current} inert={animating} />
      </div>
      <PageNavigation
        className="distortion-navigation"
        disabled={() => !scene || animating}
        onGo={(step) => scene?.go(step)}
      />
      {pages.map((page, index) => (
        <div key={page.video}>
          {/* 背景はVideoTextureへ渡し、文字のHTMLだけをCanvasへ取り込む。 */}
          <video src={page.video} muted loop playsInline preload="metadata" hidden></video>
          <HtmlTexture width={width} height={height}>
            <TextPage index={index} />
          </HtmlTexture>
        </div>
      ))}
    </main>
  );
}
