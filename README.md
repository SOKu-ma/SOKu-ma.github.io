# SO-KUMA Labs Pages

SO-KUMA Labs の公式サイトを公開するための GitHub Pages リポジトリです。

公開URL:

- [https://www.so-kuma.com](https://www.so-kuma.com)

## Structure

- `index.html`: トップページ
- `privacy/index.html`: プライバシーポリシー
- `support/index.html`: サポートページ
- `styles.css`: 共通スタイル
- `favicon.svg`: サイトアイコン

## Deployment

このリポジトリは GitHub Pages の `main` ブランチ `/ (root)` から配信する前提です。

## Apps showcase

`/apps/` はビルド不要で GitHub Pages の root 配信に追加できる静的ページです。
トップ・Privacy・Support の既存導線を維持し、ナビゲーションに Apps を追加しています。
外部フォント・解析サービス・Cookie・個人情報収集は追加していません。

### Local build / preview

Node.js と Python 3 を使用します。依存パッケージのインストールは不要です。

```sh
npm test
npm run build
npm run preview
```

プレビュー: `http://127.0.0.1:5190/apps/?lang=ja`。既存の5188ポートは使用しません。
`dist/` は検証用の生成物で Git 管理対象外です。GitHub Pages は引き続き `main` / root 配信です。
公開は承認後に既存 `main` へ通常のpushで行います。GitHub Pagesの既存ビルド・デプロイが起動します。
このサイトのために別のホスティングや独自CIを追加する必要はありません。

### 新しいアプリを追加する

1. `apps/assets/<stable-id>/` に、公開用のアイコンと個人情報のないスクリーンショットを追加。
2. `apps/catalog.json` の `apps` 配列に1件追加。`id` は変更しない固定ID、`aliases` は既存アプリから送られる識別子、`copy` は言語ごとの `name` / `description`、`stores` は確認済みの `ios` / `android` HTTPS URL。
3. `icon` と `screenshots` は `apps/` からの相対パス。`category` は既存カテゴリか任意の表示文字列。
4. `npm test` と `npm run build`、スマホ/PCプレビューを確認。紹介元アプリ側の一覧変更は不要。

新作追加はデータと画像だけで完結します。公開できないストア・画像は記載しないでください。
DartLog は Google Play のみ確認できたため、iOS リンクはありません。
`apps/sources.json` は今回の公式ストア照合記録（2026-10-07）です。更新時の出典記録に使えますが実行時のデータではありません。

### 翻訳

UI 文言は `catalog.json` の `ui`、言語選択肢は `languages`、アプリ紹介は各 `copy` で一元管理します。
現在は18の言語・地域選択です：ja, en, en-GB, es, ko, zh-TW, zh-CN, ar, bn, de, fr, id, it, pt, pt-BR, tr, nl, pl。
Starting XI の現行コードは17ロケール。generic zh / zh-Hans は Web の zh-CN、zh-Hant は zh-TW に整理しました。
これはWebの表示言語です。全アプリが18言語対応しているという宣伝ではありません。
アプリごとの確認済みコード言語と公開iOSメタデータは `verifiedAppLocales` に分けて記録しています。
Starting XI の公開iOS掲載は7言語コードで、現行開発コードの17ロケールと同一視しません。

既存5言語の紹介翻訳を保持し、Starting XI は `release_notes/2.4.0/store_text.md`、
DartLog は `firstRunHomeDescription` の既存 ARB を再利用しました。
その他は対応言語が確認できたアプリだけ公式ストアの現地語文言を再利用しています。
Google Play の現地語説明は自動翻訳が含まれる場合があるため、母語話者の校正済みとは扱いません。
新しいUI文言のネイティブ校正も未実施です。
未対応の紹介文は英語へ戻し、画面に翻訳未提供の注記を表示します。

`screenshots` は言語をキーに `{paths: [...], language: "ja", source: "公式URL"}` を持つマップです。
`en` は必須。言語完全一致 → 同一基底言語 → 英語の順で選び、異なる言語に戻った場合は注記を表示します。
日本語画像は5アプリすべて、DartLog は de/es/fr/it/nl/pl/pt/pt-BR にも公式画像があります。
ほかは確認できた英語画像を使用。画像は公式ストアから保存した原本で、文字の加工はしません。
`locale-sources.json` / `ios-locale-sources.json` / `image-locales.json` が照合・画像出典記録です。
詳しい紹介文/画像の fallback 表は作業ディレクトリの `evidence/localization-coverage.md` にあります。
アラビア語UIはRTLに切替し、画像の向きは維持します。

### 固定 URL とクエリ仕様

本番想定 URL: `https://www.so-kuma.com/apps/`。

例: `/apps/?from=batting-log&lang=ja&platform=android`

- `from`: 紹介元のアプリを上部の「いま使っているアプリ」に表示し、その下に残りのアプリを重複なく紹介。固定IDは `dartlog` / `batting-log` / `baseball-order` / `starting-xi` / `motiontag`。
  Android package ID と `batting_log_app` / `baseball_order_maker` / `soccer_lineup_board` / `motion_tag` などの別名も認識。
  未知・空・不正値は紹介元欄を表示せず、通常の全一覧。複数値は先頭を使用。画面にクエリ文字列を描画しない。
- `lang`: 指定した対応言語 → ブラウザの優先言語 → 英語の順。
  `ja-JP` / `en-US` / `es-419` / `ko-KR` / `zh-Hant-TW` などの地域指定も認識。
  `zh-Hans` / `zh-CN` / generic `zh` は簡体字、`zh-Hant` / `zh-TW` / `zh-HK` は繁体字。
  手動切替はURLの `lang` を更新し、`from` / `platform` を保持。戻る/進むでも表示が追従。
- `platform`: `ios` / `android` を優先。未知値は端末推定（iPadのデスクトップUAも対応）、推定不可なら固定順。
  対応ストアを先頭・強調表示するだけで、他OSのリンクは消さない。
- 紹介元ありの「すべてのアプリを見る」は `from` のみを解除し、通常の全一覧へ戻る。

モバイルアプリ側は将来この固定URLを開くだけで済みます。本作業ではアプリ本体を変更していません。

### 検証範囲

`npm test`: 言語/地域 fallback、全アプリと別名の紹介元判定、異常クエリ、OS優先と両ストア維持、HTTPS/ホスト制限。
`npm run build`: 重複ID、画像存在、英語必須・提供済み翻訳の完全性、ストアURLを検証。
Mac Chrome の実画面で 320 / 390 / 768 / 1440px × 18言語・地域選択、長文、紹介元別の表示、手動切替と戻る/進む、
画像読み込み、キーボード、reduced motion を確認。スクリーンショットと結果は作業ディレクトリの `evidence/` に保存。
iPhone 16e シミュレータ（iOS 26.3.1）の Safari で日本語・英語・アラビア語のURL指定表示と紹介元・その他4アプリ表示を確認。
英語・アラビア語で欠字になった紹介リンクの矢印はSVGへ置換し、Safariの実表示とChromeの3言語×4幅で再確認済みです。
Android実機 SO-53C（Android 14）のChromeで日本語表示、英語への手動切替、戻るで日本語と紹介元の復帰を確認。
端末が落ち着いたことを読み取り観測した後、縦スクロール・ギャラリー横スワイプ、打率ノートのGoogle Play掲載への遷移とChromeへの復帰、
Starting XI/打率ノートの紹介元表示、アラビア語の手動選択とRTL配置も確認。購入・インストールは行っていません。
既存Chromeの自動翻訳が一部文言を再翻訳するため、実機での操作・配置確認と、ページ本来の翻訳文の検証は区別しています。端末の翻訳設定は変更していません。
AndroidエミュレータはChrome初回規約画面で停止し、同意・ログイン・設定変更は行っていません。
iOS実機、iOSの手動操作・横向き、VoiceOver/TalkBack、各地域での購入/インストールは未検証です。
端末別の詳細結果・未確認項目は親ディレクトリの `evidence/arrow-fix-real-device.md` と `evidence/simulator-attempt.md` を参照してください。
公開リポジトリ内の検証要約は [docs/apps-validation.md](docs/apps-validation.md) にあります。

ブラウザテストは `tests/browser-check.cjs` に保存しています。Playwright と Chromium が別途必要です。
プレビュー起動中に、作業ディレクトリ（`evidence/` のある親ディレクトリ）から
`node site/tests/browser-check.cjs` を実行。外部インストール済みの場合は `PLAYWRIGHT_MODULE` と
`CHROMIUM_PATH` でそれぞれモジュールパスとブラウザ実行ファイルを指定できます。
このテストはローカル5190ページだけを操作し、ストアへのアップロードやCIを起動しません。

ターミナルや作業セッションの終了後もプレビューを継続する場合は、ビルド後に
`python3 scripts/start-preview.py` を実行します。127.0.0.1:5190 のみにバインドし、
プロセスを独立して起動します。使用中のポートは上書きしません。
ログは `.preview.log`、PID は `.preview.pid`（両方 Git 管理対象外）。
停止する場合は `.preview.pid` に記載された自分のプレビュープロセスを終了してください。

長文の検証用ページは `python3 tests/create-long-fixture.py` で `dist/long-test/` に作成できます。
実ページの紹介データを20回反復した独立fixtureで、通常の `apps/catalog.json` は変更しません。
18選択の詳細検証とHTTP結果は親ディレクトリの `evidence/localization-coverage.md` と
`evidence/localized-http-results.json` に記録しています。以前の5言語版スクリーンショットは更新前の記録です。

### 紹介元に合わせた表示

`from` と `lang` は独立した指定です。紹介元を言語の推定には使いません。
有効な `from` があれば、上部にそのアプリの名前・アイコン・紹介・言語に合った画像を表示します。
利用中のアプリとして自然につながる配置にし、そのカードにはストアボタンを出しません。
下の「ほかのアプリも、どうぞ。」には残り4アプリだけを並べ、ストア導線を維持します。
紹介元/他アプリの見出しは18のUI言語・地域選択にすべて追加済みです。

サッカーから日本語・iOS:
`http://127.0.0.1:5190/apps/?from=starting-xi&lang=ja&platform=ios`

サッカーからスペイン語・Android:
`http://127.0.0.1:5190/apps/?from=soccer_lineup_board&lang=es-419&platform=android`

5紹介元 × 18言語 × 320/390/768/1440px の360ケースをMac Chromeで確認しました。
紹介元なし/不正値、別名、言語切替のquery保持、戻る/進む、全一覧への復帰も確認済みです。
詳細は親ディレクトリの `evidence/source-flow-verification.md`。
