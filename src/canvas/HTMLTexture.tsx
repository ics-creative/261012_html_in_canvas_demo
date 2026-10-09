import type { ReactNode, Ref } from "react";

type Props = {
  children: ReactNode;
  ref?: Ref<HTMLCanvasElement>;
  width?: number;
  height?: number;
};

/** 描画元のHTMLを配置する。購読と描画開始は親の初期化でまとめて行う。 */
export function HTMLTexture({ children, ref, width = 760, height = 480 }: Props) {
  return (
    <div className="capture-staging">
      <canvas ref={ref} style={{ width, height }} {...{ content: "drawable" }}>
        <div
          inert
          style={{ width: width * devicePixelRatio, height: height * devicePixelRatio }}
          {...{ drawable: "" }}
        >
          <div style={{ zoom: devicePixelRatio }}>{children}</div>
        </div>
      </canvas>
    </div>
  );
}
