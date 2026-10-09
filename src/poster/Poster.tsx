import "./poster.css";

/** 布の描画元となる、写真・本文・入力欄を持つHTMLポスター。 */
export function Poster() {
  return (
    <article className="html-page poster">
      <header className="poster-top">
        <strong>PHOTO JOURNAL</strong>
        <span>FRANCE / ARCHITECTURE</span>
      </header>
      <div className="poster-body">
        <div className="poster-copy">
          <h2>
            Stone.
            <br />
            Slate.
          </h2>
          <p>Stone walls, slate roofs and narrow windows above the street.</p>
        </div>
        {/* 写真も元HTMLに置き、布の変形と同じ面へ描画する。 */}
        <img className="poster-photo" src="/images/photos/P3212130.jxl" alt="" />
      </div>
      <footer className="poster-bottom">
        <label>
          <span>PHOTO NOTE</span>
          <input name="caption" defaultValue="Stone walls and slate roofs." />
        </label>
        <span>01 / FRANCE</span>
      </footer>
    </article>
  );
}
