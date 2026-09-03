# ASTERIA FILES + Gap-Moe Research Survey

オリジナルキャラクターアーカイブに、キャラクター衣装変化に関する研究用アンケートを追加したGitHub Pages向け静的サイトです。

既存のキャラクター紹介画面は維持しています。アンケート用にギャップを事前示唆しやすい一部プロフィール文言のみ中立化しています。

## Survey
`/survey/` から実施します。

```text
同意
  ↓ GASでgroup 0/1/2を厳密循環割当
参加者属性
  ↓
PART 1: 基準印象 I1–I6 × 10キャラ
  ↓
PART 2: 各キャラ1変換
  GM1（画像提示直後のPrimary Outcome）
  ↓
  変化後印象 I1–I6
  心理評価 G1–G6
  補助評価 GM2–GM3
  ↓（ここで全体評価を確定）
  服装変換要因 F1–F7 選択
  選択要因の影響 −2〜+2
  ↓
自由記述
  ↓
GAS送信（Raw canonical + 冪等な正規化保存）
  ↓
詳細localStorageを削除
```

詳細は `survey/SURVEY_SPEC.md` を参照してください。

## GitHub Pages
`master`ブランチへのpush、またはworkflow_dispatchで `.github/workflows/pages.yml` が静的サイトを公開します。Settings → Pages → Sourceは `GitHub Actions` に設定してください。

## 公開前チェック
- `assets/characters/` の10画像
- `assets/survey/transforms/` の30画像
- `gas/Code.gs` のSpreadsheet ID
- `survey/survey-config.js` のGAS `/exec` URL
