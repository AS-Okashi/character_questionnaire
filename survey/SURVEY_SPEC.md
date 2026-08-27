# ASTERIA Survey — Final Protocol

## Flow
1. 研究説明・同意
2. 参加者属性
3. PART 1: 基準キャラクター10人の印象 I1–I6
4. PART 2: 各キャラクターについて以下を実施
   - 変化後印象 I1–I6
   - 心理評価 G1–G6
   - Gap-Moe response GM1–GM3
   - 上記を確定
   - 服装変換要因 F1–F7 を複数選択
   - 選択要因だけ Gap-Moeへの影響を −2〜+2 で評価
5. 任意自由記述
6. GAS送信
7. 終了

服装要因名はI/G/GM回答を確定するまで表示しない。これにより具体的な服装観点が全体印象・Gap-Moe評定を先に誘導することを抑える。

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
- GM1 この衣装変化にギャップ萌えを感じた（Primary Outcome）
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
参加者UUIDをハッシュして0/1/2の3群に割り当て、キャラクターindexとgroupからa/b/cを循環割当する。各参加者は各キャラクターにつき1変換のみを見る。全体では3条件が概ね均等になる。

## Data model
`transform[].garment_factors` に以下を保存する。

```json
{
  "selected": ["F2", "F4"],
  "none_selected": false,
  "effects": {"F2": 2, "F4": 1}
}
```

GASでは `GarmentFactors` に各参加者×キャラクター×variant×F1–F7を1行ずつ保存し、未選択要因も `selected=false` として保持する。
