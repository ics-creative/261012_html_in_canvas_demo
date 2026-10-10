import { Fragment } from "react";

/** 文字をマスクで包み、折り返しても続く表示順をCSSへ渡す見出し。 */
export function RevealHeading({ text, tag: Heading = "h3" }: { text: string; tag?: "h2" | "h3" }) {
  let offset = 0;

  return (
    // 誌面ごとにトリガーを登録し直し、新しい文字を初回の状態から再生する。
    <Heading key={text} className="reveal-heading">
      {text.split(" ").map((word) => {
        const start = offset;
        offset += word.length + 1;
        return (
          <Fragment key={start}>
            {start > 0 && " "}
            {/* 単語を一つの要素へまとめ、空白は通常のHTMLテキストとして残す。 */}
            <span className="reveal-word" data-offset={start}>
              {Array.from(word, (character, index) => (
                <span className="reveal-mask" key={index}>
                  <span className="reveal-char">{character}</span>
                </span>
              ))}
            </span>
          </Fragment>
        );
      })}
    </Heading>
  );
}
