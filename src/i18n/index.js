import { ru } from './ru.js';
import { en } from './en.js';

const LOCALES = { ru, en };
const STORAGE_KEY = 'idle_rpg_lang';

export function getLang() {
  return localStorage.getItem(STORAGE_KEY) || 'ru';
}

export function setLang(lang) {
  localStorage.setItem(STORAGE_KEY, lang);
}

export function t(key) {
  const lang = getLang();
  return LOCALES[lang]?.[key] ?? LOCALES.ru[key] ?? key;
}
