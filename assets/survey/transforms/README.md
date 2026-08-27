# Outfit transformation images

アンケート PART 2 で使用する衣装変換画像を配置するディレクトリです。

配置規則:

```text
assets/survey/transforms/<character-id>/a.png
assets/survey/transforms/<character-id>/b.png
assets/survey/transforms/<character-id>/c.png
```

例:

```text
assets/survey/transforms/asagiri-mio/a.png
assets/survey/transforms/asagiri-mio/b.png
assets/survey/transforms/asagiri-mio/c.png
```

内部条件は以下を想定していますが、参加者画面には表示されません。

- `a`: Baseline-consistent
- `b`: Intended Gap-Moe
- `c`: Strong / Alternative Contrast

生成意図は正解ラベルとして扱わず、実際の印象差・意外性・キャラクターらしさ・ギャップ萌えはアンケート結果から算出してください。
