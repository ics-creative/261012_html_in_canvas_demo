import { SplitText } from "gsap/SplitText";

function splitHeading(element: HTMLElement | null) {
  if (!element) return;
  // 単語と文字のマスクをSplitTextへ任せ、空白と選択可能なテキストを保つ。
  SplitText.create(element, {
    type: "words,chars",
    tag: "span",
    wordsClass: "reveal-word",
    charsClass: "reveal-char",
    mask: "chars",
    propIndex: true,
    aria: "none",
  });
}

/** 文字をマスクで包み、折り返しても続く表示順をCSSへ渡す見出し。 */
export function RevealHeading({ text, tag: Heading = "h3" }: { text: string; tag?: "h2" | "h3" }) {
  return (
    // 誌面ごとにトリガーを登録し直し、新しい文字を初回の状態から再生する。
    <Heading key={text} className="reveal-heading" ref={splitHeading}>
      {text}
    </Heading>
  );
}
