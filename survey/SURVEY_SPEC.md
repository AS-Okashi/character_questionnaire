# ASTERIA Survey — Protocol

## Flow
1. 研究説明・同意
2. GASから参加条件group（0/1/2）を取得
3. 参加者属性
4. PART 1: 基準キャラクター10人の印象 I1–I6
5. PART 2: 各キャラクターについて以下を実施
   - 元画像＋衣装変更後画像と、PART 1と同一のプロフィールを提示
   - **GM1（Primary Outcome）を最初に単独で取得・確定**
   - 変化後印象 I1–I6
   - 心理評価 G1–G6
   - 補助Gap-Moe response GM2–GM3
   - 上記を確定
   - 服装変換要因 F1–F7 を複数選択
   - 選択要因だけGap-Moeへの影響を −2〜+2 で評価
6. 任意のキャラクター選択・自由記述
7. GAS送信
8. 送信成功後、詳細回答をlocalStorageから削除
9. 終了

GM1は、各キャラクターのI/G等の詳細質問に先立って単独取得する。
服装要因名は、そのキャラクターのI/G/GM回答を確定するまで表示しない。
前のキャラクターで提示した質問による影響まで排除する設計ではない。

## Stimulus presentation
- 基準画像・衣装変更後画像はcontainで全体表示する。
- 通常は2:3の表示枠を使用する。PART 2の左右配置では、
  比較する2枚に同じ高さの表示枠を使用する。
- PART 2のGM1・詳細評価・服装要因の各画面は共通レイアウトとする。
- 画面幅1,100px以上では、左に比較画像とプロフィール、
  右に質問と回答確定ボタンを配置する。
- スクロールはページ全体で行い、右列の独立スクロールは設けない。
- 左パネル全体が画面高から上下各20pxを除いた領域に収まる場合、
  画面上端から20pxの位置に追従固定する。
- 左パネルが収まらない場合は固定せず、ページ全体で閲覧可能にする。
- 画面幅1,100px未満では、比較画像・プロフィール・質問の縦配置とする。
- ウィンドウサイズと左パネルの高さが変わった場合、固定可否を再判定する。
- プロフィールは紹介文・年齢・趣味・特技・好きなものとする。
- PART 1とPART 2で共通の描画関数を使用する。
- PART 2のGM1・詳細評価・服装要因の全画面で同一プロフィールを再掲する。
- 過去に回答した印象評定値は再表示しない。
- 画像を提示する各画面では、全画像の読み込み・デコード完了と
  描画機会を待ってから、回答欄と次へボタンを有効化する。
- 画像の読み込みに失敗した場合は、回答を確定できない。
- shown_at、gm1_shown_at、core_shown_at、factor_shown_atは
  回答を有効化した時刻とする。
- duration_ms等は、その時刻から回答確定までの経過時間であり、
  プロフィールの確認・スクロール・中断も含む。
- 同じ画面を再読み込みした場合は、再表示後の時刻から計測し直す。

## I: Impression
- I1 かわいい
- I2 かっこいい
- I3 落ち着いている
- I4 活発である
- I5 大人っぽい
- I6 親しみやすい

## G: Psychological response
- G1 元印象との差
- G2 意外性
- G3 キャラクターらしさの保持
- G4 似合い度
- G5 魅力増加
- G6 違和感

## GM: Gap-Moe response
- GM1 この衣装変化にギャップ萌えを感じた（Primary Outcome、画像提示直後に単独取得）
- GM2 元の印象との違いそのものに魅力を感じた
- GM3 このキャラクターの意外な一面に惹かれた

## F: Garment transformation factors
- F1 色・色調
- F2 服装ジャンル・テイスト
- F3 フォーマル度
- F4 シルエット・形状
- F5 装飾・小物
- F6 肌の露出・身体の見せ方
- F7 柄・素材感

まず「変化したと感じた要素」を複数選択する。選択した項目だけについて、以下の方向付き5段階を回答する。

- −2: 大きく弱めた
- −1: 少し弱めた
- 0: 影響しなかった
- +1: 少し高めた
- +2: 大きく高めた

各選択肢に数値と説明を併記する。質問文では、選んだ要素の変化によって魅力を感じやすくなったか、感じにくくなったかを尋ね、色の変化を使った回答例を示す。

「特に変化を感じた要素はない」も選択可能。その場合、F寄与度は回答しない。

## Variant assignment
参加者ID生成後、アンケート開始時にGASへ割当を要求する。GASは`ScriptLock`の下で新規参加者を厳密に `0 → 1 → 2 → 0 ...` の順に割り当て、`Assignments`へ保存する。同一participant_idから再要求された場合は同じgroupを返す。

character indexを `i = 0..9`、groupを `g = 0..2` とすると、variantは以下で決定する。

```text
variant_index = (i + g) mod 3
0=a, 1=b, 2=c
```

各参加者は各キャラクターにつき1変換のみを見る。

## Final optional questions
「最もギャップ萌えを感じたキャラクター」と「印象の違いは感じたがギャップ萌えにはつながらなかったキャラクター」は、それぞれ名前・元の姿・その参加者が見た衣装変更後の姿を並べたカードから1人選ぶ。各設問に「特になし」と「回答しない」を用意し、理由は任意の自由記述とする。

## Data model
`transform[].garment_factors` に以下を保存する。

```json
{
  "selected": ["F2", "F4"],
  "none_selected": false,
  "effects": {"F2": 2, "F4": 1}
}
```

GM1は`transform[].gap_moe.GM1`に従来通り保存し、取得タイミングとして`gm1_shown_at`、`gm1_answered_at`、`gm1_duration_ms`も保存する。

GASでは `GarmentFactors` に各参加者×キャラクター×variant×F1–F7を1行ずつ保存し、未選択要因も `selected=false` として保持する。

## GAS integrity / retry model
- 自由記述の確定後、送信画面へ初めて進んだ時点でcompleted_atと
  送信用JSON文字列を固定し、ブラウザのstateに保存する。
- 再送・ページ再読み込み後も同じJSON文字列を送信する。
- 通信確認用nonceはリクエストごとに更新し、回答payloadには含めない。
- 保存用JSONダウンロードも、送信するJSON文字列と同じ内容とする。
- `RawResponses`をcanonical sourceとする。
- `SubmissionStatus`で`normalizing / complete / error`を管理する。
- derived sheets（Participants / BaselineRatings / TransformRatings / GarmentFactors / OpenResponses）はparticipant_id単位で削除して再構築できるため、途中保存に失敗しても同じpayloadを再送すれば回復できる。
- `complete`済みかつ同一payloadの再送は`duplicate-ok`を返す。
- `participant_id`が存在するだけでは成功扱いにしない。
- GAS側でcharacter、variant、group、I/G/GM、F選択・effect等を検証し、不正payloadは保存しない。

## Browser local storage
送信前は途中再開のため回答詳細をlocalStorageに保存する。GASが送信成功を返した後は、年齢・性別・評定・自由記述等を削除し、再送防止用の`participant_id`、survey version、assignment group、submitted_atのみを残す。

再送用のsubmission_payload_jsonも、送信成功後に詳細回答と一緒に削除する。
survey versionを更新すると旧版の途中回答・送信済みマーカーは読み込まない。
旧版データを新版へ自動移行したり、削除したりはしない。
