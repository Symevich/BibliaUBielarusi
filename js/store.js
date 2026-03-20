/**
 * store.js — Global application state
 *
 * Responsibilities:
 *   • Persist and retrieve the active language via localStorage.
 *   • Cache loaded section arrays so each JSON file is fetched only once
 *     per session, regardless of how many times the user navigates to it.
 *   • Expose all UI translation strings (T) keyed by locale code.
 *
 * Design: plain module-level singleton. No reactive proxy needed because
 * views re-render fully on each navigation — they read state at render time.
 *
 * NOTE: This file is intentionally unchanged. JSON data + translations
 * are managed here; content teams edit T without touching app logic.
 */

// ─── Supported locales ────────────────────────────────────────────
export const LOCALES = ['be', 'ru', 'en'];

// ─── Language ─────────────────────────────────────────────────────

/**
 * Returns the active locale. Falls back to 'be' (Belarusian) if nothing
 * is stored or the stored value is not in LOCALES.
 * @returns {string}
 */
export function getLang() {
  const stored = localStorage.getItem('lang');
  return LOCALES.includes(stored) ? stored : 'be';
}

/**
 * Persist a new locale code.
 * @param {string} lang  Must be one of LOCALES.
 */
export function setLang(lang) {
  if (LOCALES.includes(lang)) localStorage.setItem('lang', lang);
}

// ─── Section JSON cache ────────────────────────────────────────────
// Key format: "${sectionId}_${lang}"  e.g. "3_be"
// Value: Array of exhibit objects as parsed from section-N.json.
// Cleared on language switch so stale translated data is never served.

const _cache = new Map();

/** @returns {Array|null} */
export function getCachedSection(sectionId, lang) {
  return _cache.get(`${sectionId}_${lang}`) ?? null;
}

/** @param {Array} data */
export function setCachedSection(sectionId, lang, data) {
  _cache.set(`${sectionId}_${lang}`, data);
}

/** Clear all cached section data (call on language switch). */
export function clearSectionCache() {
  _cache.clear();
}

// ─── UI translations ───────────────────────────────────────────────
// Section titles live in data/sections.json, not here, so the content
// team controls them without touching code.

export const T = {
  be: {
    siteTitle:    'Біблія ў Беларусі',
    siteSubtitle: 'Гід па выставе',
    welcomeButton:'Пачаць',
    allSections:  'Усе раздзелы',
    section:      'Раздзел',
    objects:      'аб\'ектаў',
    preface:      'Прадмова',
    backToSection:'← Да раздзела',
    prev:         'Папярэдні',
    next:         'Наступны',
    playAudio:    'Прайграць аўдыё',
    pauseAudio:   'Паўза',
    loading:      'Загрузка…',
    errorLoad:    'Памылка загрузкі.',
    retry:        'Паўтарыць',
    notFound:     'Аб\'ект не знойдзены.',
    noObjects:    'У гэтым раздзеле пакуль няма аб\'ектаў.',
    altImage:     'Здымак аб\'екта',
    exhibit:      'Экспанат',
    readMore:     'Чытаць далей',
    readLess:     'Схаваць',
    themeDark:    'Цёмная тэма',
    themeLight:   'Светлая тэма',
    prevSection:  'Папярэдні раздзел',
    nextSection:  'Наступны раздзел',
  },
  ru: {
    siteTitle:    'Библия в Беларуси',
    siteSubtitle: 'Гид по выставке',
    welcomeButton:'Начать',
    allSections:  'Все разделы',
    section:      'Раздел',
    objects:      'объектов',
    preface:      'Предисловие',
    backToSection:'← К разделу',
    prev:         'Предыдущий',
    next:         'Следующий',
    playAudio:    'Воспроизвести',
    pauseAudio:   'Пауза',
    loading:      'Загрузка…',
    errorLoad:    'Ошибка загрузки.',
    retry:        'Повторить',
    notFound:     'Объект не найден.',
    noObjects:    'В этом разделе пока нет объектов.',
    altImage:     'Фото объекта',
    exhibit:      'Экспонат',
    readMore:     'Читать далее',
    readLess:     'Скрыть',
    themeDark:    'Тёмная тема',
    themeLight:   'Светлая тема',
    prevSection:  'Предыдущий раздел',
    nextSection:  'Следующий раздел',
  },
  en: {
    siteTitle:    'Bible in Belarus',
    siteSubtitle: 'Exhibition Guide',
    welcomeButton:'Start',
    allSections:  'All Sections',
    section:      'Section',
    objects:      'objects',
    preface:      'Preface',
    backToSection:'← Back to Section',
    prev:         'Previous',
    next:         'Next',
    playAudio:    'Play audio',
    pauseAudio:   'Pause',
    loading:      'Loading…',
    errorLoad:    'Failed to load.',
    retry:        'Retry',
    notFound:     'Object not found.',
    noObjects:    'This section has no objects yet.',
    altImage:     'Object photo',
    exhibit:      'Exhibit',
    readMore:     'Read more',
    readLess:     'Show less',
    themeDark:    'Dark theme',
    themeLight:   'Light theme',
    prevSection:  'Previous section',
    nextSection:  'Next section',
  },
};
