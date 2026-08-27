window.SURVEY_CONFIG = {
  surveyVersion: "2026.08.24-v1",

  // GAS をウェブアプリとしてデプロイした後、/exec の URL をここに設定してください。
  // 例: https://script.google.com/macros/s/XXXXXXXXXXXX/exec
  gasEndpoint: "",

  // 未設定のままでもUI確認は可能です。送信画面ではJSONのローカル保存が案内されます。
  requireGasEndpointForFinalSubmit: true,

  // 変換画像の配置規則:
  // assets/survey/transforms/<character-id>/<variant>.png
  // variant は a / b / c。参加者画面にはこの内部ラベルを表示しません。
  transformImagePath(characterId, variantId) {
    return `../assets/survey/transforms/${characterId}/${variantId}.png`;
  }
};
