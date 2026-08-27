# Survey module

GitHub Pagesで動作する静的アンケートです。既存のキャラクター紹介画面を維持し、`/survey/` を追加しています。

## 公開前の設定
1. `assets/characters/` に基準画像10枚を配置
2. `assets/survey/transforms/<character-id>/a.png|b.png|c.png` に30変換画像を配置
3. `gas/Code.gs` をGASに貼り、`SPREADSHEET_ID` を設定
4. `setupSheets()` を実行
5. GASをウェブアプリとしてデプロイ
6. `survey-config.js` の `gasEndpoint` に `/exec` URLを設定

## 服装要因評価
I/G/GMを確定した後にだけF1–F7を表示します。選択した服装要因についてのみ−2〜+2の寄与方向を回答します。

## GAS保存先
- Participants
- BaselineRatings
- TransformRatings
- GarmentFactors
- OpenResponses
- RawResponses

`participant_id` による重複送信防止を行います。送信後はGASのHTML応答から `postMessage` でブラウザへ成功通知を返し、保存完了確認後に終了画面へ進みます。
