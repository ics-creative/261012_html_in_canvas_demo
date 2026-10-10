import { SourceLinks } from "./SourceLinks";
import { RevealHeading } from "./RevealHeading";
import { pages, laserPages } from "./pages";

/** 写真と本文を持つページ遷移の描画元HTML。 */
export function TransitionPage({
  page,
  basePath,
  laser,
}: {
  page: number;
  basePath: string;
  laser: boolean;
}) {
  /** タイル遷移とは別のHTMLを用い、切断中も文字と写真を一緒に描く。 */
  const catalog = laser ? laserPages : pages;
  const content = catalog[page];
  const label = `${laser ? "SEINE" : "FRANCE"} / ${content.id}`;

  return (
    // 写真と重ねた文字・リンクを同じHTMLとして切断する。
    <article className={`html-page ${laser ? "laser-page" : "transition-page"}`}>
      <section className="page-hero">
        {/* 全面の写真も元HTMLに含め、タイルと静止画面の見た目を揃える。 */}
        <img className="hero-photo" src={content.image} alt="" />
        <header className="source-header">
          <span>{label}</span>
          <SourceLinks pages={catalog} page={content.id} basePath={basePath} />
        </header>
        <div className="page-copy">
          <RevealHeading tag="h2" text={content.name} />
          <p>{content.description}</p>
          <SourceLinks pages={catalog} page={content.id} basePath={basePath} hero />
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
        <span>{label}</span>
        <SourceLinks pages={catalog} page={content.id} basePath={basePath} />
      </footer>
    </article>
  );
}
