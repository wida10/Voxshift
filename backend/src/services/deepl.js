import axios from 'axios';

// DeepL free tier uses api-free.deepl.com (keys end in :fx)
// DeepL pro uses api.deepl.com
// We auto-detect based on the key suffix
function getDeepLBaseUrl() {
  const key = process.env.DEEPL_API_KEY || '';
  return key.endsWith(':fx')
    ? 'https://api-free.deepl.com/v2'
    : 'https://api.deepl.com/v2';
}

const LANG_MAP = {
  es: 'ES', en: 'EN', pt: 'PT', fr: 'FR', de: 'DE',
};

export async function translate(text, targetLanguage) {
  const targetCode = LANG_MAP[targetLanguage] || targetLanguage.toUpperCase();

  const response = await axios.post(
    `${getDeepLBaseUrl()}/translate`,
    new URLSearchParams({
      text,
      target_lang: targetCode,
    }),
    {
      headers: {
        Authorization: `DeepL-Auth-Key ${process.env.DEEPL_API_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  return response.data.translations[0].text;
}
