# ASTERIA Survey — Protocol

## Flow
1. 研究説明・同意
2. GASから参加条件group（0/1/2）を取得
3. 参加者属性
4. PART 1: 基準キャラクター10人の印象 I1–I6
5. PART 2: 各キャラクターについて以下を実施
   - 元画像＋衣装変更後画像を提示
   - **GM1（Primary Outcome）を最初に単独で取得・確定**
   - 変化後印象 I1–I6
   - 心理評価 G1–G6
   - 補助Gap-Moe response GM2–GM3
   - 上記を確定
   - 服装変換要因 F1–F7 を複数選択
   - 選択要因だけGap-Moeへの影響を −2〜+2 で評価
6. 任意自由記述
7. GAS送信
8. 送信成功後、詳細回答をlocalStorageから削除
9. 終了

GM1はI/G等の詳細質問による誘導を抑えるため、画像ペアを見た直後に取得する。服装要因名はI/G/GM回答を確定するまで表示せず、具体的な服装観点によるプライミングを抑える。

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

- −2: ギャップ萌えを大きく弱めた
- −1: やや弱めた
- 0: ほとんど影響しなかった
- +1: やや高めた
- +2: 大きく高めた

「特に変化を感じた要素はない」も選択可能。その場合、F寄与度は回答しない。

## Variant assignment
参加者ID生成後、アンケート開始時にGASへ割当を要求する。GASは`ScriptLock`の下で新規参加者を厳密に `0 → 1 → 2 → 0 ...` の順に割り当て、`Assignments`へ保存する。同一participant_idから再要求された場合は同じgroupを返す。

character indexを `i = 0..9`、groupを `g = 0..2` とすると、variantは以下で決定する。

```text
variant_index = (i + g) mod 3
0=a, 1=b, 2=c
```

各参加者は各キャラクターにつき1変換のみを見る。

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
- `RawResponses`をcanonical sourceとする。
- `SubmissionStatus`で`normalizing / complete / error`を管理する。
- derived sheets（Participants / BaselineRatings / TransformRatings / GarmentFactors / OpenResponses）はparticipant_id単位で削除して再構築できるため、途中保存に失敗しても同じpayloadを再送すれば回復できる。
- `complete`済みかつ同一payloadの再送は`duplicate-ok`を返す。
- `participant_id`が存在するだけでは成功扱いにしない。
- GAS側でcharacter、variant、group、I/G/GM、F選択・effect等を検証し、不正payloadは保存しない。

## Browser local storage
送信前は途中再開のため回答詳細をlocalStorageに保存する。GASが送信成功を返した後は、年齢・性別・評定・自由記述等を削除し、再送防止用の`participant_id`、survey version、assignment group、submitted_atのみを残す。
