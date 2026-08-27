window.SURVEY_CONFIG = {
  surveyVersion: "2026.08.26-final-v2",
  // GASをウェブアプリとしてデプロイ後、/exec URLを設定してください。
  gasEndpoint: "",
  requireGasEndpointForFinalSubmit: true,
  transformImagePath(characterId, variantId) {
    return `../assets/survey/transforms/${characterId}/${variantId}.png`;
  }
};
