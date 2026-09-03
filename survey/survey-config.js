window.SURVEY_CONFIG = {
  surveyVersion: "2026.08.26-final-v2",
  // GASをウェブアプリとしてデプロイ後、/exec URLを設定してください。
  gasEndpoint: "https://script.google.com/macros/s/AKfycbyLQbmx9TOjwkM9IIZDur-6cRJvnONW4v3Iw-zXo5lB_dxZjMFEdrN6XSxNDQtMjsI/exec",
  requireGasEndpointForFinalSubmit: true,
  transformImagePath(characterId, variantId) {
    return `../assets/survey/transforms/${characterId}/${variantId}.png`;
  }
};
