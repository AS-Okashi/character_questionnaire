# Survey module

GitHub Pages上で動作する静的アンケートです。ビルド処理やサーバーサイドコードは不要です。

## 公開前に必要な設定

1. `../assets/characters/` に既存の基準キャラクター画像があることを確認。
2. `../assets/survey/transforms/<character-id>/a.png|b.png|c.png` に30枚の衣装変換画像を配置。
3. `../gas/Code.gs` をGoogle Apps Scriptに設定し、ウェブアプリとしてデプロイ。
4. `survey-config.js` の `gasEndpoint` にGASの `/exec` URLを設定。

## ランダム割当

参加者ごとにUUIDを生成し、そのハッシュ値を `0/1/2` の3群に割り当てます。各群ではキャラクターごとの `a/b/c` 条件を循環させるため、1参加者につき各キャラクター1画像・計10変換画像を提示しつつ、参加者全体では各キャラクターの3条件が概ね均等に評価されます。

PART 1 と PART 2 のキャラクター提示順は独立にシャッフルされ、PART 1 最後のキャラクターが PART 2 最初に連続しないよう調整されます。

## 送信

GitHub Pages → GAS はクロスオリジン制約を避けるため、hidden form + hidden iframe でPOSTします。POSTパラメータ `payload` にJSON文字列を格納し、GAS側のHTML応答から `postMessage` で成功/失敗を返すため、ブラウザ側でも保存完了を確認してから終了画面へ進みます。

GAS側では以下のシートへ正規化して保存します。

- `Participants`
- `BaselineRatings`
- `TransformRatings`
- `OpenResponses`
- `RawResponses`

`participant_id` の重複送信はGAS側で無視します。

## ローカル確認

リポジトリルートで既存の `start-local.sh` を使い、`/survey/` を開いてください。
