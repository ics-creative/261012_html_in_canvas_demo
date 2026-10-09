import { Link } from "react-router";

/** 誌面の遷移リンクを共有し、MVでは移動先を動詞とSVG矢印で明示する。 */
export function SourceLinks({
  pages,
  page,
  basePath,
  hero = false,
}: {
  pages: readonly { id: string; name: string }[];
  page: string;
  basePath: string;
  hero?: boolean;
}) {
  // MVには他のページだけを並べ、同じ画面へ戻る操作を混ぜない。
  const destinations = hero ? pages.filter(({ id }) => id !== page) : pages;

  return (
    <nav className={`source-links ${hero ? "hero-links" : ""}`}>
      {destinations.map(({ id, name }) => (
        <Link key={id} to={`${basePath}/${id}`} className={id === page ? "current" : undefined}>
          <span className="source-link-number">{id}</span>
          <span>{hero ? `View ${name}` : name}</span>
          {hero && (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 12h16m-6-6 6 6-6 6" />
            </svg>
          )}
        </Link>
      ))}
    </nav>
  );
}
