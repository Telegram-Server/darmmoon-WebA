import type { LangCode } from '../../../types';

// Traditional Chinese is used in Taiwan, Hong Kong and Macau, or requested with the `Hant` script
const RE_TRADITIONAL_CHINESE = /(hant|-tw|-hk|-mo)/;

export function getSuggestedLanguage() {
  const lang = navigator.language.toLowerCase();
  if (lang.startsWith('zh')) {
    return (RE_TRADITIONAL_CHINESE.test(lang) ? 'zh-hant' : 'zh-hans') as LangCode;
  }
  if (lang === 'pt-br') return lang as LangCode;

  return lang.substr(0, 2) as LangCode;
}
