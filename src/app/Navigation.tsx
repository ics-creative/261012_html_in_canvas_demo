/** 前後のページへ進む共通操作。無効状態は各デモのページ数・再生状態から決める。 */
export function PageNavigation({
  className,
  disabled,
  onGo,
}: {
  className: string;
  disabled: (step: -1 | 1) => boolean;
  onGo: (step: -1 | 1) => void;
}) {
  return (
    <nav className={`page-navigation ${className}`}>
      {([-1, 1] as const).map((step) => (
        <button key={step} disabled={disabled(step)} onClick={() => onGo(step)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d={step < 0 ? "m14 6-6 6 6 6" : "m10 6 6 6-6 6"} />
          </svg>
        </button>
      ))}
    </nav>
  );
}
