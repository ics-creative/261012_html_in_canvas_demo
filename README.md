# HTML in Canvas

Reactで作ったHTMLに、WebGPUによる変形やエフェクトを加える8つのデモです。文字選択・右クリック・フォーム入力など、元HTMLの操作と組み合わせています。

## 起動

```sh
npm install
npm run dev
```

HTML in CanvasとWebGPUを使うChrome Beta向けです。[http://localhost:5180/#/transition/01](http://localhost:5180/#/transition/01) を開きます。

## 公開

[GitHub Pages](https://ics-creative.github.io/261012_html_in_canvas_demo/)で公開しています。`main`へのpushでGitHub Actionsがビルドし、`dist/`をデプロイします。Viteの`base: "./"`と素材の相対パスで、公開フォルダー内から読み込みます。

## デモ一覧

| No. | デモ                                                 | 内容・操作                                                                                                                               | 描画     |
| --- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 01  | [Transitions](http://localhost:5180/#/transition/01) | 縦スクロールの誌面をタイルで切り替える。MV・ヘッダー・フッターのリンクから遷移。                                                         | Three.js |
| 02  | [Laser](http://localhost:5180/#/laser/01)            | 誌面内のリンクでランダムに切断。断片が同時に消え、次のページが拡大しながらフェードイン。                                                 | PixiJS   |
| 03  | [Distortion](http://localhost:5180/#/distortion)     | 前後ボタンで切り替える。背景と文字を時間差で歪ませ、文字は退場後に次の内容が入場する。演出中はボタンを無効化。                           | Three.js |
| 04  | [Cloth](http://localhost:5180/#/cloth)               | 正面の平らなHTMLから始まり、風で揺れる布になる。布のドラッグでつかみ、背景または右ドラッグで視点を回転。ホイールでズーム。               | Three.js |
| 05  | [Book](http://localhost:5180/#/book)                 | 前後ボタン・紙端のクリックやドラッグでページをめくる。背景のドラッグで回転、ホイールでズーム。本文の選択と文字・画像の右クリックに対応。 | Three.js |
| 06  | [CRT](http://localhost:5180/#/crt)                   | 入力できるHTMLフォームにCRT・グリッチ・発光を重ねる。「Effects」でON/OFF。送信はデモ内の表示を更新する。                                 | PixiJS   |
| 07  | [CRT 3D](http://localhost:5180/#/crt-3d)             | iMac風の筐体の曲面画面にHTMLフォームを表示。筐体や背景のドラッグで視点を回転し、画面上では入力・選択・右クリックを操作。                 | Three.js |
| 08  | [Glass](http://localhost:5180/#/glass)               | 写真一覧の「Photo Library」ツールバーがガラス部分。「Liquid Glass」と「CSS blur」で屈折とCSSのぼかしを比較。                             | Three.js |

URLはReact Routerの`HashRouter`で管理します。共通ヘッダーの下全体が描画領域で、UIは英語表記です。

TransitionsとLaserは縦スクロールに対応し、現在見えている範囲から遷移を開始します。見出しの表示にはCSSの`timeline-trigger`・`animation-trigger`と`sibling-index()`による時間差を使います。

Glassでは元HTMLの文字選択・右クリックを保ちますが、屈折した縁の操作領域は元HTMLの位置です。

## 開発

Vite、React 19.3、TypeScript 7、React Routerを使用しています。描画はThree.jsとPixiJSのWebGPU、アニメーションはGSAP、ドラッグは`@use-gesture/vanilla`、スタイルはネイティブCSSです。

| コマンド         | 用途                                                   |
| ---------------- | ------------------------------------------------------ |
| `npm run build`  | ビルド。出力先は`dist/`。                              |
| `npm run lint`   | oxlintで検査。設定は[.oxlintrc.json](.oxlintrc.json)。 |
| `npm run format` | oxfmtで整形。設定は[.oxfmtrc.json](.oxfmtrc.json)。    |

Three.jsは`HTMLTexture`、LaserはPixiJSの`HTMLSource`で元HTMLを取り込みます。CRTは`requestPaint()`と`drawElementImage()`でフォームをテクスチャへ反映します。CRT 3DはThree.jsのみで描画します。

各デモは`lazy`・`Suspense`で読み込み、フォント・写真・HTMLの初回paint・GPU描画を終えてから表示します。CRTとCRT 3Dの入力は`Activity`で保持し、非表示中は描画を止めます。画面を離れる際のイベント解除とGPUリソースの解放は`AbortSignal`にまとめています。

## ディレクトリ構成

| パス                                 | 内容                                                                                                   |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| [`src/app/`](src/app/)               | ルーティング、共通ヘッダー、表示切り替え、スクロールバー。                                             |
| [`src/canvas/`](src/canvas/)         | HTML取り込み、描画の初期化・破棄、ヒット領域、視点操作。`cloth/`に布の物理、`laser/`にレーザーの描画。 |
| [`src/transition/`](src/transition/) | タイル遷移、誌面、見出しのスクロールアニメーション。Laserとページ切り替えの枠組みを共有。              |
| [`src/distortion/`](src/distortion/) | 背景・文字の変形とぼかし。                                                                             |
| [`src/book/`](src/book/)             | 本のHTML誌面、紙の変形、シーン。                                                                       |
| [`src/crt/`](src/crt/)               | CRTフォームとCRT 3D。                                                                                  |
| [`src/glass/`](src/glass/)           | 写真一覧とガラスの屈折。                                                                               |
| [`src/poster/`](src/poster/)         | 布に描く元HTML。                                                                                       |
| [`public/`](public/)                 | 写真、紙・木材のテクスチャ、静的シーン。                                                               |
| [`patches/`](patches/)               | PixiJSへの修正。                                                                                       |

### PixiJSのパッチ

PixiJS 8.22.0のWebGPUバッチやフィルターに残るテクスチャ参照を解放するため、[pixi.js+8.22.0.patch](patches/pixi.js+8.22.0.patch)を適用しています。`npm install`時に`postinstall`の`patch-package`が自動実行されます。PixiJSを更新する際は、上流での修正状況を確認してパッチを見直します。

## 素材・参考

写真は提供された20点のJPEG XLを変換せず、[`public/images/photos/`](public/images/photos/)に配置しています。本の木材テクスチャは[Smoked Walnut Veneer — Jenelle van Heerden / Poly Haven](https://polyhaven.com/a/smoked_walnut_veneer)（CC0）です。

- タイル遷移：[Simple tiled motion of photo display](https://labs.clockmaker.jp/works/230514_three_tiled_motion)、[ClockMaker Effects](https://clockmaker.jp/project/flash-effects/)
- レーザー：[PixiJS HTML Laser](https://pixijs-html-in-canvas.vercel.app/)、[Slicer implements GlowLine — miyaoka](https://beautifl.net/run/51/)
- 布：[HTML cloth](https://arrival.space/htmlcanvas)
- スクロールアニメーション：[ICS MEDIAの記事](https://ics.media/entry/230718/)、[timeline-triggerの作例](https://github.com/ics-creative/230718_scroll_driven_animations/blob/main/index-timeline-trigger.html)、[Chrome公式の解説](https://developer.chrome.com/blog/scroll-triggered-animations)
- CRT 3D：[Appleの実機資料](https://support.apple.com/en-us/docs/mac/8001)
- ガラス：[AppleのLiquid Glass解説](https://developer.apple.com/videos/play/wwdc2025/219/)、[liquidGL](https://github.com/naughtyduk/liquidGL)、[ybouaneのシェーダー実装](https://github.com/ybouane/liquidglass/blob/main/src/shaders.ts)
