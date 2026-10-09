import type { ReactNode } from "react";

/** 2倍で描画するHTML誌面の横幅。UVからの選択座標にも使う。 */
export const pageWidth = 1040;
/** 2倍で描画するHTML誌面の高さ。 */
export const pageHeight = 1440;
const chapters = [
  {
    title: "Streets",
    image: "/images/photos/P3171064.jxl",
    essayImage: "/images/photos/P3171023.jxl",
    detailImage: "/images/photos/P3171076.jxl",
    subtitle: "Market stalls, rooftops and planted walls",
    paragraphs: [
      "Market stalls line a narrow street beneath the trees. Pale umbrellas cover the tables, while people move through the open space in the middle. Sunlight reaches the pavement in small patches between the branches.",
      "From above, the same city becomes a dense pattern of roofs. Chimneys and dormer windows give each building a separate outline. The streets are harder to see, but gaps between the roofs still reveal their direction.",
      "A planted wall brings greenery onto the side of a building. Leaves cover most of its upper surface, with a few windows showing through. At street level, the pale facade remains exposed beneath the plants.",
    ],
    detail: "A planted facade",
    note: "The plants follow the height of the building, leaving the lower wall and pavement clear. Windows interrupt the green surface. The edge of the planting is uneven, unlike the straight roofline and the regular openings behind it.",
    crop: "center",
  },
  {
    title: "Buildings",
    image: "/images/photos/P3304136.jxl",
    essayImage: "/images/photos/P3171112.jxl",
    detailImage: "/images/photos/BF_06735.jxl",
    subtitle: "Stone facades and the shapes above the street",
    paragraphs: [
      "A tall stone facade rises behind the trees. Repeated windows hold the lower parts together, while towers and carved details break up the skyline. The tree canopy hides the street and brings the upper floors into view.",
      "Another roof appears from a high viewpoint, with the city spread out behind it. Its broad central arch and rows of small details remain visible against the sky. Clouds cast a different light across each part of the roof.",
      "At street level, doors and windows give the facade a familiar scale. Pedestrians pass beneath the large openings. Dark ironwork and recessed entrances stand out against the pale stone, while the upper floors catch the sun.",
    ],
    detail: "At street level",
    note: "The large arched openings are much taller than the people in front of them. Above, windows and balconies repeat across the facade. Deep shadows inside the entrances make the thickness of the surrounding stone easier to see.",
    crop: "center",
  },
  {
    title: "Seine",
    image: "/images/photos/P3324743.jxl",
    essayImage: "/images/photos/P3325229.jxl",
    detailImage: "/images/photos/P3325234.jxl",
    subtitle: "Evening light along the river",
    paragraphs: [
      "A narrow pink band remains above the far bridge as the sky turns blue. The tower stands beside the left bank, and the river leads towards the horizon. The first reflections are visible along the darker edge of the water.",
      "Later, the tower and riverside lamps are much brighter than the surrounding trees. Gold reflections stretch across the blue water. The view still has the same broad outline, but the illuminated parts now carry most of its detail.",
      "A passing boat leaves a bright line near the far bank. The foreground water is smoother, with long reflections beneath the lamps. Small white points around the bridge remain distinct against the dark trees and sky.",
    ],
    detail: "Lights on the water",
    note: "Each lamp makes a long reflection below it. The moving boat leaves a separate pale streak along the bank. The photograph keeps both kinds of light visible: vertical reflections in the water and a horizontal trace across the scene.",
    crop: "left center",
  },
];

type Page = Partial<(typeof chapters)[number]> & {
  layout: string;
  header?: string;
  body?: ReactNode;
  footer?: string;
};

const pages: Page[] = [
  {
    layout: "title",
    header: "France / Photo journal",
    title: chapters.map(({ title }) => `${title}.`).join("\n"),
    body: (
      <div className="book-contents">
        {chapters.map((chapter, index) => (
          <div key={chapter.title}>
            <span>{chapter.title}</span>
            <span>{String(index * 3 + 3).padStart(2, "0")}</span>
          </div>
        ))}
      </div>
    ),
    footer: "Streets, buildings and the Seine",
  },
  {
    layout: "introduction",
    header: "Introduction",
    title: "Around the city",
    image: "/images/photos/P3325074.jxl",
    paragraphs: [
      "These photographs move from the streets to the rooftops, then return to the river after sunset. Markets, planted walls and stone facades show different parts of the city in daylight.",
      "Each chapter begins with a full-page photograph. The following pages bring together related views and a few details that are easy to miss at first glance.",
      "The last chapter follows the light along the Seine. Blue sky gives way to the illuminated tower, passing boats and long reflections on the water.",
    ],
    footer: "France / Photo journal",
  },
  ...chapters.flatMap((chapter, index) => [
    { layout: "plate", image: chapter.image, crop: chapter.crop, footer: chapter.title },
    {
      ...chapter,
      layout: "essay",
      header: `0${index + 1} / ${chapter.title}`,
      image: chapter.essayImage,
      crop: undefined,
    },
    {
      layout: "detail",
      header: `${chapter.title} / Detail`,
      title: chapter.detail,
      image: chapter.detailImage,
      paragraphs: [chapter.note],
    },
  ]),
  {
    layout: "index",
    header: "France / Index",
    title: "Photographs",
    body: chapters.map((chapter, index) => (
      <figure key={chapter.title}>
        <img src={chapter.image} alt="" />
        <figcaption>
          <span>{String(index * 3 + 3).padStart(2, "0")}</span>
          {chapter.title}
        </figcaption>
      </figure>
    )),
    footer: "Streets / Buildings / Seine",
  },
];

/** 表紙・導入・3章・索引を含む総ページ数。 */
export const pageCount = pages.length;

/** 写真集の各ページを、文字を選択・コピーできる英語のHTMLで組み立てる。 */
export function BookPage({ index }: { index: number }) {
  const page = pages[index];
  const Root = page.layout === "plate" ? "figure" : "article";
  const Caption = page.layout === "plate" ? "figcaption" : "footer";
  // 見出しとノンブルを一か所に置き、誌面ごとの差分だけを以下で組み立てる。
  return (
    <Root className={`book-page book-${page.layout}`} lang="en">
      {page.header && <header>{page.header}</header>}
      {page.title && <h2>{page.title}</h2>}
      {page.image && <img src={page.image} alt="" style={{ objectPosition: page.crop }} />}
      {page.subtitle && <h3>{page.subtitle}</h3>}
      {page.paragraphs && (
        <div className="book-copy">
          {page.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      )}
      {page.body}
      <Caption>
        <span>{page.footer ?? "France / Photo journal"}</span>
        <span>{String(index + 1).padStart(2, "0")}</span>
      </Caption>
    </Root>
  );
}
