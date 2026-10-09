import { SourceLinks } from "../../transition/SourceLinks";
import { RevealHeading } from "../../transition/RevealHeading";
import type { PageId } from "../../transition/TransitionPage";

/** レーザーで切り替える、セーヌ川の夕景と夜景の誌面。 */
export const laserPages = [
  {
    id: "01",
    name: "Dusk",
    image: "images/photos/P3324490.jxl",
    description: "The Eiffel Tower beside the Seine as the daylight fades.",
    sections: [
      {
        title: "The river at sunset",
        body: "A warm band of light remains near the horizon, beneath thin layers of cloud. The river carries the same colours through the centre of the photograph. The Eiffel Tower is still a dark outline, with the trees along the banks darker again.",
      },
      {
        title: "Between the banks",
        body: "The two banks lead towards the low bridge in the distance. Boats interrupt the open surface of the water, leaving small changes in its reflection. The tower stands to one side, allowing the river to remain the main route through the picture.",
      },
      {
        title: "Before the lights",
        body: "There is enough daylight to see the trees and the shape of each boat. A few lights are beginning to show along the water. Later photographs from the river reveal how these small points become much more prominent as the sky darkens.",
      },
    ],
  },
  {
    id: "02",
    name: "Blue hour",
    image: "images/photos/P3324910.jxl",
    description: "Gold lights on the tower, blue water and a narrow pink horizon.",
    sections: [
      {
        title: "The tower lights up",
        body: "The tower is now illuminated from base to tip. Its warm light stands against the deep blue sky, while a little pink remains above the horizon. The change is visible across the whole scene, from the tower to the reflections beneath the bridge.",
      },
      {
        title: "Reflections on the Seine",
        body: "Lights along the bank make broken yellow lines on the water. Each reflection stretches towards the camera and changes shape with the ripples. The darker parts between them still carry the blue of the sky, keeping the two colours distinct.",
      },
      {
        title: "A changing sky",
        body: "Clouds retain a little colour after the sun has gone below the horizon. Their broad horizontal bands contrast with the narrow tower. A boat passes through the middle distance, adding another small shape between the bright banks and the dark water.",
      },
    ],
  },
  {
    id: "03",
    name: "Night",
    image: "images/photos/P3325232.jxl",
    description: "An illuminated tower and a passing boat recorded across the water.",
    sections: [
      {
        title: "After dark",
        body: "The sky has lost most of its colour, making the tower the brightest large shape in the photograph. Trees frame it from below and from the right. The light on the river follows a different pattern, spreading into long streaks close to the camera.",
      },
      {
        title: "A boat in motion",
        body: "The passing boat is recorded as a broad band of white and blue light. Nearby buildings and the tower keep their sharp edges. These two kinds of detail sit together in the same frame: a fixed skyline and the path of something moving across it.",
      },
      {
        title: "Light on the bank",
        body: "Small lights beneath the tower mark the riverbank. Their reflections are short near the far shore and longer in the foreground. The dark trees separate these points from the much larger illuminated structure, giving the night view a clear outline.",
      },
    ],
  },
] as const;

/** タイル遷移とは別のHTMLを用い、切断中も文字と写真を一緒に描く。 */
export function LaserPage({ page, basePath }: { page: PageId; basePath: string }) {
  const content = laserPages.find(({ id }) => id === page)!;
  return (
    <article className="html-page laser-page">
      <section className="page-hero">
        {/* 写真と重ねた文字・リンクを同じHTMLとして切断する。 */}
        <img className="hero-photo" src={content.image} alt="" />
        <header className="source-header">
          <span>SEINE / {page}</span>
          <SourceLinks pages={laserPages} page={page} basePath={basePath} />
        </header>
        <div className="page-copy">
          <RevealHeading tag="h2" text={content.name} />
          <p>{content.description}</p>
          <SourceLinks pages={laserPages} page={page} basePath={basePath} hero />
        </div>
      </section>
      <div className="page-details">
        {content.sections.map(({ title, body }, index) => (
          <section key={title}>
            <div>
              <span>0{index + 1}</span>
              <RevealHeading text={title} />
            </div>
            <p>{body}</p>
          </section>
        ))}
      </div>
      <footer>
        <span>SEINE / {page}</span>
        <SourceLinks pages={laserPages} page={page} basePath={basePath} />
      </footer>
    </article>
  );
}
