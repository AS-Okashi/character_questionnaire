# ASTERIA FILES

オリジナルキャラクターアーカイブのモックサイトです。提供された立ち絵を仮ビジュアルとして使用し、10人分のキャラクター詳細ページを用意しています。

## 構成

- `index.html` — キャラクター一覧とサイトトップ
- `characters/*.html` — 各キャラクターの詳細ページ
- `scripts/characters.js` — キャラクター情報のデータ
- `scripts/character.js` — 詳細ページ共通テンプレート
- `styles.css` — 共通デザインとレスポンシブスタイル

キャラクターを追加・差し替えするときは、まず`CHARACTERS`配列にデータと`image`パスを追加し、詳細ページのHTML入口を1つ追加してください。現在は10人すべて`assets/characters/`内の画像を参照しています。元のモック画像は`source_image.png`として参照用に残しています。

## GitHub Pages

`master`ブランチへpushすると、`.github/workflows/pages.yml`が静的ファイルをGitHub Pagesへデプロイします。リポジトリのSettings → Pagesで、Sourceを`GitHub Actions`に設定してください。

## ローカル確認

Pythonを使う場合は、環境ルールに従い`uv run`経由で静的サーバーを起動します。

```bash
bash start-local.sh
```

`start-local.sh`がプロジェクトの場所を自動で特定するため、どのディレクトリから実行してもルートURLが使えます。手動で起動する場合は、プロジェクトルートを明示してください。
8000番ポートが使用中の場合は、ポート番号を指定できます。

```bash
bash start-local.sh 8124
```

```bash
uv run --directory /net/uekilab-nas06/23j5062_sugihara/chara_intro python -m http.server 8000 --directory /net/uekilab-nas06/23j5062_sugihara/chara_intro
```

その後、`http://localhost:8000/`を開いてください。
