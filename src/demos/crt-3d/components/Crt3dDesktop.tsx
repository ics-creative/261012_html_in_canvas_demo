import { useState } from "react";
import { NoteFields } from "../../../shared/components/NoteFields";

/** Aqua風のウィンドウに置いた、ブラウザー標準で入力できるHTMLフォーム。 */
export function Crt3dDesktop({ pixelRatio }: { pixelRatio: number }) {
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
            <i></i>
            <i></i>
            <i></i>
          </span>
          <strong>Travel notes</strong>
        </header>
        <div className="retro-content">
          <h2>New note</h2>
          <NoteFields />
          <footer>
            <output>{saved ? "Note saved." : ""}</output>
            <button>Save note</button>
          </footer>
        </div>
      </section>
    </form>
  );
}
