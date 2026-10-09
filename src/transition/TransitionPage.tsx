import { SourceLinks } from "./SourceLinks";
import { RevealHeading } from "./RevealHeading";

/** ページ遷移の対象となるHTML誌面。 */
export const pages = [
  {
    id: "01",
    name: "Paris",
    image: "/images/photos/P3171021.jxl",
    description: "Tree-lined avenues, pale rooftops and the skyline beyond.",
    sections: [
      {
        title: "Along the avenue",
        body: "Two rows of trees run through the centre of the photograph. The road narrows towards the distant towers, giving the view a clear direction. On either side, blocks of pale buildings follow the streets away from this central line.",
      },
      {
        title: "Above the rooftops",
        body: "From street level, each building has a separate entrance and facade. From here, the roofs form a continuous surface. Chimneys, dormer windows and small courtyards interrupt the pattern, while the trees make the main avenue easy to follow.",
      },
      {
        title: "The distant skyline",
        body: "Glass towers rise beyond the lower buildings in the foreground. Their vertical edges contrast with the long avenue and the shallow rooflines. A little haze softens the most distant details without hiding the difference between the two parts of the city.",
      },
    ],
  },
  {
    id: "02",
    name: "Gardens",
    image: "/images/photos/BF_06794.jxl",
    description: "Clipped hedges and circular beds beside a long stretch of water.",
    sections: [
      {
        title: "Paths and planting",
        body: "Straight paths divide the garden into small planted sections. Curved beds sit inside these boundaries, with clipped hedges tracing their edges. The view from above brings the whole arrangement into focus, including the narrow spaces between one bed and the next.",
      },
      {
        title: "Rows of trees",
        body: "Small trees stand in evenly spaced rows along the paths. Their shadows fall across the pale ground and separate each trunk from the next. Taller trees beyond the garden create a much less regular edge at the back of the photograph.",
      },
      {
        title: "Beyond the beds",
        body: "The water stretches across the background, bordered by a dense line of trees. Its broad, level surface contrasts with the detailed planting nearby. The photograph includes both scales: individual beds in the foreground and the wider landscape beyond them.",
      },
    ],
  },
  {
    id: "03",
    name: "Coast",
    image: "/images/photos/P3233004.jxl",
    description: "Mont Saint-Michel across wet sand and shallow water.",
    sections: [
      {
        title: "Across the sand",
        body: "Wet sand fills most of the foreground. Small channels lead towards the island, and thin patches of water reflect the sky. With no buildings close to the camera, the open beach makes the compact outline of Mont Saint-Michel stand out.",
      },
      {
        title: "One compact skyline",
        body: "Stone buildings climb towards the tallest part of the island. From this distance, separate roofs become a single stepped silhouette. The dark base meets the pale sand along a low horizontal edge, while the upper buildings rise into the sky.",
      },
      {
        title: "Clouds and reflections",
        body: "Large white clouds cross the blue sky above the island. Their reflections are broken by the ripples and marks in the sand. The bright upper part of the photograph and the darker wet beach meet around the small cluster of buildings on the horizon.",
      },
    ],
  },
] as const;

/** 誌面とURLを対応させる識別子。 */
export type PageId = (typeof pages)[number]["id"];

/** 写真と本文を持つページ遷移の描画元HTML。 */
export function TransitionPage({ page, basePath }: { page: PageId; basePath: string }) {
  const content = pages.find((item) => item.id === page)!;
  const { name } = content;

  return (
    <article className="html-page transition-page">
      <section className="page-hero">
        {/* 全面の写真も元HTMLに含め、タイルと静止画面の見た目を揃える。 */}
        <img className="hero-photo" src={content.image} alt="" />
        <header className="source-header">
          <span>FRANCE / {page}</span>
          <SourceLinks pages={pages} page={page} basePath={basePath} />
        </header>
        <div className="page-copy">
          <RevealHeading tag="h2" text={name} />
          <p>{content.description}</p>
          <SourceLinks pages={pages} page={page} basePath={basePath} hero />
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
        <span>FRANCE / {page}</span>
        <SourceLinks pages={pages} page={page} basePath={basePath} />
      </footer>
    </article>
  );
}
