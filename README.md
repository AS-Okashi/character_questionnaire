# ASTERIA FILES + Research Survey

オリジナルキャラクターアーカイブと、キャラクター衣装変化に関する印象評価アンケートをまとめた静的サイトです。既存のキャラクター紹介画面は維持し、`/survey/` を新規追加しています。

## 構成

- `index.html` — キャラクター一覧とサイトトップ
- `characters/*.html` — 各キャラクターの詳細ページ
- `scripts/characters.js` — キャラクター情報。アンケートでギャップを事前誘導しないよう、一部説明文を中立的に調整済み
- `survey/` — アンケートUI・回答ロジック
- `assets/survey/transforms/` — 3条件×10キャラクターの衣装変換画像置き場
- `gas/Code.gs` — Google Apps Script送信先サンプル
- `styles.css` — 既存サイト共通デザイン

## Survey flow

```text
研究説明・同意
  ↓
参加者属性
  ↓
PART 1: 10キャラクターの基準印象（I1〜I6）
  ↓
PART 2: 10キャラクターの衣装変化評価
        変化後印象 I1〜I6
        変化評価 G1〜G6
        ギャップ萌え GM1〜GM3
  ↓
任意自由記述
  ↓
GASへ送信
```

参加者1人には各キャラクターにつき3変換条件のうち1枚だけを提示します。参加者IDから3群へランダム割当し、全体で各条件が概ね均等になる設計です。

詳細は `survey/README.md` と `gas/Code.gs` を参照してください。

## GitHub Pages

`master`ブランチへpushすると、`.github/workflows/pages.yml`がリポジトリ全体を静的ファイルとしてGitHub Pagesへデプロイします。Settings → Pages → Source は `GitHub Actions` に設定してください。

`.nojekyll` を含むため、追加のビルド処理は不要です。

## 公開前チェック

- `assets/characters/` に10人の基準画像が存在する
- `assets/survey/transforms/<id>/a.png|b.png|c.png` の30枚を配置する
- `gas/Code.gs` の `SPREADSHEET_ID` を設定してGASをデプロイする
- `survey/survey-config.js` の `gasEndpoint` に `/exec` URLを設定する

## ローカル確認

```bash
bash start-local.sh
```

起動後:

- トップ: `http://localhost:8000/`
- アンケート: `http://localhost:8000/survey/`
