import { useState } from "react";

/** Aqua風のウィンドウに置いた、ブラウザー標準で入力できるHTMLフォーム。 */
export function RetroDesktop({ pixelRatio }: { pixelRatio: number }) {
  const [saved, setSaved] = useState(false);
  return (
    <form
      className="retro-desktop"
      style={{ zoom: pixelRatio }}
      onInput={() => setSaved(false)}
      onSubmit={(event) => {
        event.preventDefault();
        setSaved(true);
      }}
    >
      <div className="retro-menu">
        <strong>Photo Journal</strong>
        <span>File</span>
        <span>Edit</span>
        <span>View</span>
      </div>
      <section className="retro-window">
        <header>
          <span className="retro-window-lights">
            <i />
            <i />
            <i />
          </span>
          <strong>Travel notes</strong>
        </header>
        <div className="retro-content">
          <h2>New note</h2>
          <div className="retro-fields">
            <label>
              Name
              <input name="name" autoComplete="name" placeholder="Your name" required />
            </label>
            <label>
              Email
              <input
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
              />
            </label>
          </div>
          <label>
            Notes
            <textarea name="message" placeholder="Write a note from your trip." required />
          </label>
          <footer>
            <output>{saved ? "Note saved." : ""}</output>
            <button type="submit">Save note</button>
          </footer>
        </div>
      </section>
    </form>
  );
}
