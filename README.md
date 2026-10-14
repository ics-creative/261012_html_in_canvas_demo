# HTML in Canvas

Reactで作ったHTMLに、WebGPUによる変形やエフェクトを加えるデモ集です。文字選択・右クリック・フォーム入力など、元HTMLの操作と組み合わせています。

## 起動

```sh
npm install
npm run dev
```

HTML in CanvasとWebGPUを使うChrome Beta向けです。[http://localhost:5180/#/transition/01](http://localhost:5180/#/transition/01) を開きます。

## 公開

[GitHub Pages](https://ics-creative.github.io/261012_html_in_canvas_demo/)で公開しています。`main`へのpushでGitHub Actionsがビルドし、`dist/`をデプロイします。Viteの`base: "./"`と素材の相対パスで、公開フォルダー内から読み込みます。

共有用のOGP画像は[`public/ogp.png`](public/ogp.png)（1200×630px）です。タイトル・説明・画像URLは[`index.html`](index.html)で設定しています。

## デモ一覧

| No.  | デモ                                                 | 内容・操作                                                                                                                               | 描画          |
| ---- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| 01   | [Transitions](http://localhost:5180/#/transition/01) | 縦スクロールの誌面をタイルで切り替える。MV・ヘッダー・フッターのリンクから遷移。                                                         | Three.js      |
| 02   | [Laser](http://localhost:5180/#/laser/01)            | 誌面内のリンクでランダムに切断。断片が同時に消え、次のページが拡大しながらフェードイン。                                                 | PixiJS        |
| 03   | [Cloth](http://localhost:5180/#/cloth)               | 正面の平らなHTMLから始まり、風で揺れる布になる。布のドラッグでつかみ、背景または右ドラッグで視点を回転。ホイールでズーム。               | Three.js      |
| 04   | [Book](http://localhost:5180/#/book)                 | 前後ボタン・紙端のクリックやドラッグでページをめくる。背景のドラッグで回転、ホイールでズーム。本文の選択と文字・画像の右クリックに対応。 | Three.js      |
| 05   | [CRT](http://localhost:5180/#/crt)                   | 入力できるHTMLフォームにCRT・グリッチ・発光を重ねる。「Effects」でON/OFF。送信はデモ内の表示を更新する。                                 | PixiJS        |
| 06   | [Distortion](http://localhost:5180/#/distortion)     | AV1動画の背景を前後ボタンで切り替える。動画とHTML文字を時間差で歪ませ、文字は退場後に次の内容が入場する。演出中はボタンを無効化。        | Three.js      |
| 07   | [CRT 3D](http://localhost:5180/#/crt-3d)             | iMac風の筐体の曲面画面にHTMLフォームを表示。筐体や背景のドラッグで視点を回転し、画面上では入力・選択・右クリックを操作。                 | Three.js      |
| 08   | [Glass](http://localhost:5180/#/glass)               | アイコン付きセグメントで「CSS」「HTML in Canvas」「SVG」の3方式を切り替え、ぼかしと屈折を比較。                                          | CSS・Three.js |
| 08-b | [Glass SVG](http://localhost:5180/#/glass-svg)       | 同じ写真一覧をSVGの`foreignObject`経由で画像化し、ガラスの背面へ使う。ツールバー内のリンクからHTML in Canvas版と切り替え。               | Three.js      |

URLはReact Routerの`HashRouter`で管理します。共通ヘッダーの下全体が描画領域で、UIは英語表記です。

TransitionsとLaserは縦スクロールに対応し、現在見えている範囲から遷移を開始します。見出しの表示にはCSSの`timeline-trigger`・`animation-trigger`と`sibling-index()`による時間差を使います。

Distortionの背景動画は[`public/videos/`](public/videos/)のAV1 MP4（1920×1080・10bit）です。NormandyとLouvreは60fps、Parisは30fpsで再生します。音声を外してループ再生し、MP4の索引を先頭へ配置しています。Three.jsの`VideoTexture`を使い、表示中と遷移先だけを再生します。文字はHTML in Canvasで描き、静止時の文字選択を保ちます。

Glassは32件の写真を縦にスクロールできます。「CSS」は通常のDOMと`backdrop-filter`だけで表示します。「HTML in Canvas」と「SVG」はガラス部分だけを端末の解像度で処理し、ガウスぼかしと縁の屈折を合成します。元HTMLの文字選択・右クリックを保ちますが、屈折した縁の操作領域は元HTMLの位置です。

3方式で白い半透明のツールバーを共有し、HTML in Canvas・SVG版は白い下地を濃くして文字の視認性を高めます。黒い半透明の選択背景はCSSのアンカーポジショニングと共通のスプリング曲線で横へ移動します。HTML in Canvas・SVG版は表面の傾きと屈折率から背景の輪郭をレンズ状に曲げます。CSSの公式ロゴも含めてアイコンと文字は黒、選択中はiOSの高コントラスト用ブルー（`#5CB8FF`）で表示します。幅768px以下では、ツールバーの「HTML in Canvas」を「Canvas」に短縮します。

Glass SVGは[modern-screenshot](https://github.com/qq15725/modern-screenshot)で、HTML・CSS・JPEG XLを`foreignObject`入りのSVG画像へ埋め込みます。ガラスの屈折処理と写真一覧は既存版と共有し、スクロール・サイズ変更時に背面画像を更新します。SVG画像自体は操作できないため、一覧の表示と操作は通常のDOMに残し、ガラスだけを透明なCanvasで重ねています。

## 開発

Vite、React 19.3、TypeScript 7、React Routerを使用しています。描画はThree.jsとPixiJSのWebGPU、アニメーションはGSAP、ドラッグは`@use-gesture/vanilla`、布のWorker通信はComlink、スタイルはネイティブCSSです。

| コマンド         | 用途                                                   |
| ---------------- | ------------------------------------------------------ |
| `npm run build`  | ビルド。出力先は`dist/`。                              |
| `npm run lint`   | oxlintで検査。設定は[.oxlintrc.json](.oxlintrc.json)。 |
| `npm run format` | oxfmtで整形。設定は[.oxfmtrc.json](.oxfmtrc.json)。    |

Three.jsは`HTMLTexture`、LaserはPixiJSの`HTMLSource`で元HTMLを取り込みます。CRTは`requestPaint()`と`drawElementImage()`でフォームをテクスチャへ反映します。CRT 3DはThree.jsのみで描画します。

リンクを押すとURLと現在地を即座に切り替えます。`lazy`・`Suspense`でコードを読み込み、フォント・写真・HTMLの初回paint・GPU描画の準備中は共通のLoadingを表示します。各ページは離脱時に破棄し、再訪問時に初期化します。画面を離れる際のイベント解除とGPUリソースの解放は`AbortSignal`にまとめています。

CRT 3Dは、[モデル](public/scenes/crt-3d.json.gz)を読み込み、HTMLフォームをモニターの画面に表示します。
筐体の形状・照明・材質はモデルに保存しています。

## ディレクトリ構成

| パス                                 | 内容                                                                                                   |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| [`src/app/`](src/app/)               | ルーティング、共通ヘッダー、表示切り替え、スクロールバー。                                             |
| [`src/canvas/`](src/canvas/)         | HTML取り込み、描画の初期化・破棄、ヒット領域、視点操作。`cloth/`に布の物理、`laser/`にレーザーの描画。 |
| [`src/transition/`](src/transition/) | タイル遷移、誌面、見出しのスクロールアニメーション。Laserとページ切り替えの枠組みを共有。              |
| [`src/distortion/`](src/distortion/) | 動画背景・HTML文字の変形とぼかし。                                                                     |
| [`src/book/`](src/book/)             | 本のHTML誌面、紙の変形、シーン。                                                                       |
| [`src/crt/`](src/crt/)               | CRTフォームとCRT 3D。                                                                                  |
| [`src/glass/`](src/glass/)           | 写真一覧とガラスの屈折。                                                                               |
| [`src/poster/`](src/poster/)         | 布に描く元HTML。                                                                                       |
| [`public/`](public/)                 | 写真、紙・木材のテクスチャ、静的シーン。                                                               |
| [`patches/`](patches/)               | PixiJSへの修正。                                                                                       |

### PixiJSのパッチ

PixiJS 8.22.0のWebGPUバッチやフィルターに残るテクスチャ参照を解放するため、[pixi.js+8.22.0.patch](patches/pixi.js+8.22.0.patch)を適用しています。`npm install`時に`postinstall`の`patch-package`が自動実行されます。PixiJSを更新する際は、上流での修正状況を確認してパッチを見直します。

## 素材・参考

写真は作者の池田がパリで撮影してきたもの。
本の木材テクスチャは[Smoked Walnut Veneer — Jenelle van Heerden / Poly Haven](https://polyhaven.com/a/smoked_walnut_veneer)（CC0）です。

CSSのアイコンは[CSS-Nextの公式ロゴ](https://github.com/CSS-Next/logo.css)（CC0）のSVGを使用しています。

- タイル遷移：[Simple tiled motion of photo display](https://labs.clockmaker.jp/works/230514_three_tiled_motion)、[ClockMaker Effects](https://clockmaker.jp/project/flash-effects/)
- レーザー：[PixiJS HTML Laser](https://pixijs-html-in-canvas.vercel.app/)、[Slicer implements GlowLine — miyaoka](https://beautifl.net/run/51/)
- 布：[HTML cloth](https://arrival.space/htmlcanvas)
- スクロールアニメーション：[ICS MEDIAの記事](https://ics.media/entry/230718/)、[timeline-triggerの作例](https://github.com/ics-creative/230718_scroll_driven_animations/blob/main/index-timeline-trigger.html)、[Chrome公式の解説](https://developer.chrome.com/blog/scroll-triggered-animations)
- CRT 3D：[Appleの実機資料](https://support.apple.com/en-us/docs/mac/8001)
- ガラス：[AppleのLiquid Glass解説](https://developer.apple.com/videos/play/wwdc2025/219/)、[Appleの配色](https://developer.apple.com/design/human-interface-guidelines/color)、[liquidGL](https://github.com/naughtyduk/liquidGL)、[ybouaneのシェーダー実装](https://github.com/ybouane/liquidglass/blob/main/src/shaders.ts)
- セグメントの移動：[CSSのlinear()でUIが軽快になる! スプリングアニメーション活用術13選](https://ics.media/entry/260402/)
