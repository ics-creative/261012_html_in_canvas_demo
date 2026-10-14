import "../styles/note-fields.css";

/** CRTと3D画面で同じ名前・メール・本文の入力欄を使う。 */
export function NoteFields() {
  return (
    <>
      <div className="note-fields">
        <label>
          Name
          <input name="name" autoComplete="name" required placeholder="Your name" />
        </label>
        <label>
          Email
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
          />
        </label>
      </div>
      <label className="note-message">
        Notes
        <textarea name="message" required placeholder="Write a note from your trip."></textarea>
      </label>
    </>
  );
}
