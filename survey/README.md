# Survey module

GitHub Pagesで動作する静的アンケートです。既存のキャラクター紹介画面を維持し、`/survey/` を追加しています。

## 公開前の設定
1. `assets/characters/` に基準画像10枚を配置
2. `assets/survey/transforms/<character-id>/a.png|b.png|c.png` に30変換画像を配置
3. `gas/Code.gs` をGASに貼り、`SPREADSHEET_ID` を設定
4. `setupSheets()` を実行
5. GASをウェブアプリとしてデプロイ
6. `survey-config.js` の `gasEndpoint` に `/exec` URLを設定

## PART 2の評価順
各画像ペアについて次の順で取得します。

1. GM1（Primary Outcome）を画像提示直後に単独で確定
2. I1–I6
3. G1–G6
4. GM2–GM3
5. F1–F7の選択と、選択要因の−2〜+2寄与評価

F1–F7はI/G/GMを確定した後にのみ表示します。

## 参加条件割当
クライアント側UUIDハッシュは使用しません。アンケート開始時にGASが`ScriptLock`の下でgroup 0/1/2を厳密な循環順に割り当て、`Assignments`シートへ保存します。通信に失敗した場合は割当が確認できるまでアンケート本体へ進みません。

## GAS保存先
- Assignments
- SubmissionStatus
- RawResponses（canonical payload）
- Participants
- BaselineRatings
- TransformRatings
- GarmentFactors
- OpenResponses

GASはpayloadをサーバ側で検証します。保存処理はparticipant_id単位で冪等化されており、途中で正規化シートへの書込に失敗しても、同じ回答を再送すると不足データを再構築できます。`participant_id`が存在するだけで`duplicate-ok`にはしません。

## localStorage
送信前は途中再開のため回答を保存します。GASから成功応答を受けた後は詳細回答を削除し、送信済みマーカーとparticipant_id等の最小情報だけを残します。
