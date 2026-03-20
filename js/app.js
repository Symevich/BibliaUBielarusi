/**
 * app.js — Entry point and shared utilities
 *
 * Responsibilities:
 *   • Boot the router on DOMContentLoaded.
 *   • Wire language-switcher buttons in the static header.
 *   • Export shared helpers used by all views:
 *       fetchSections()    fetch + cache data/sections.json
 *       fetchSection()     fetch + cache a section's object array
 *       resolveImg()       "img/5.webp" → "assets/img/5.webp"
 *       buildPicture()     <picture> WebP + JPG fallback HTML string
 *       splitImages()      separate _ico thumbnails from display images
 *       buildImages()      render all images stacked in the media box
 *       setLoading()       show spinner in #app
 *       setError()         show error + retry button in #app
 *       getApp()           return the #app element
 *
 * Import graph (no cycles):
 *   app.js  ←  store.js, router.js
 *   views   ←  app.js, store.js, player.js
 *   router  ←  views (dynamic import only)
 */

'use strict';

import { getLang, setLang, clearSectionCache,
         getCachedSection, setCachedSection, T } from './store.js';
import { initRouter }                            from './router.js';

// ═══════════════════════════════════════════════════════════════════
//  DATA FETCHING
// ═══════════════════════════════════════════════════════════════════

/** Module-level cache for data/sections.json */
let _sectionsCache = null;

/**
 * Fetch the lightweight section metadata index.
 * Result is cached — the file is requested only once per session.
 * @returns {Promise<Array>}
 */
export async function fetchSections() {
  if (_sectionsCache) return _sectionsCache;
  const res = await fetch('data/sections.json');
  if (!res.ok) throw new Error(`sections.json HTTP ${res.status}`);
  _sectionsCache = await res.json();
  return _sectionsCache;
}

/**
 * Fetch one section's full object array for the given language.
 * Uses the store's Map as a per-session cache.
 *
 * Fallback chain: requested lang → 'be'.
 * If /ru/section-N.json does not exist yet, the BE content is shown.
 *
 * @param {string|number} sectionId
 * @param {string}        lang       'be' | 'ru' | 'en'
 * @returns {Promise<Array>}
 */
export async function fetchSection(sectionId, lang) {
  const cached = getCachedSection(sectionId, lang);
  if (cached) return cached;

  try {
    const res = await fetch(`data/${lang}/section-${sectionId}.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    setCachedSection(sectionId, lang, data);
    return data;
  } catch (err) {
    if (lang !== 'be') {
      console.warn(`[app] ${lang}/section-${sectionId} failed — falling back to be`);
      return fetchSection(sectionId, 'be');
    }
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════════════
//  IMAGE UTILITIES
// ═══════════════════════════════════════════════════════════════════

/**
 * JSON stores paths as "img/5.webp"; assets live at "assets/img/5.webp".
 * @param {string} jsonPath
 * @returns {string}
 */
export function resolveImg(jsonPath) {
  if (!jsonPath) return '';
  if (jsonPath.startsWith('assets/')) return jsonPath;
  return `assets/${jsonPath}`;
}

/**
 * Build a <picture> element string: WebP source + JPG fallback img.
 * @param {string}  src       Resolved asset path (WebP).
 * @param {string}  alt       Alt text.
 * @param {string}  [cls]     CSS class(es) for the <img>.
 * @param {boolean} [lazy]    Use loading="lazy". Default true.
 * @returns {string}
 */
export function buildPicture(src, alt, cls = '', lazy = true) {
  if (!src) return '';
  const jpg     = src.replace(/\.webp$/i, '.jpg');
  const loading = lazy ? 'loading="lazy"' : 'loading="eager"';
  return `<picture>
    <source srcset="${src}" type="image/webp">
    <img src="${jpg}" alt="${alt}" class="${cls}" ${loading} decoding="async">
  </picture>`;
}

/**
 * Split a raw img array from JSON into:
 *   thumb   — the _ico variant (or first image) for list cards
 *   display — images without _ico, shown in the detail view
 *
 * Both paths are resolved via resolveImg().
 *
 * @param {string[]} imgArray  e.g. ["img/12_ico.webp","img/12.webp"]
 * @returns {{ thumb: string, display: string[] }}
 */
export function splitImages(imgArray) {
  const all     = (imgArray || []).map(resolveImg);
  const ico     = all.find(p => p.includes('_ico.'));
  const display = all.filter(p => !p.includes('_ico.'));
  return {
    thumb:   ico || display[0] || '',
    display,
  };
}

// ═══════════════════════════════════════════════════════════════════
//  IMAGE RENDERING
// ═══════════════════════════════════════════════════════════════════

/**
 * Render all display images for an exhibit inside the media box.
 *
 * - Single image  → plain <picture class="object-detail__media-single">
 * - Multiple images → <div class="media-stack"> containing one
 *   <picture> per image, all visible and stacked vertically.
 *   Each image is capped at 500px height via CSS.
 *
 * No JavaScript interaction required.
 *
 * @param {string[]} images   Resolved asset paths (no _ico entries).
 * @param {string}   alt      Base alt text.
 * @returns {string}
 */
export function buildImages(images, alt) {
  if (!images.length) return '';

  if (images.length === 1) {
    return buildPicture(images[0], alt, 'object-image', false);
  }

  const pictures = images.map((src, i) =>
    buildPicture(src, `${alt} (${i + 1} / ${images.length})`, 'object-image', i > 0)
  ).join('');

  return `<div class="media-stack">${pictures}</div>`;
}

// ═══════════════════════════════════════════════════════════════════
//  #app STATE HELPERS
// ═══════════════════════════════════════════════════════════════════

/** @returns {HTMLElement} */
export function getApp() {
  return document.getElementById('app');
}

/** Replace #app content with a centred spinner. */
export function setLoading() {
  const t = T[getLang()];
  getApp().innerHTML = `
    <div class="state-loading" role="status" aria-live="polite">
      <div class="spinner" aria-hidden="true"></div>
      <p>${t.loading}</p>
    </div>`;
}

/**
 * Replace #app content with an error message and a retry button.
 * @param {string}   message
 * @param {Function} onRetry
 */
export function setError(message, onRetry) {
  const t = T[getLang()];
  getApp().innerHTML = `
    <div class="state-error" role="alert">
      <p>${message}</p>
      <button class="btn btn--primary" id="js-retry">${t.retry}</button>
    </div>`;
  document.getElementById('js-retry')?.addEventListener('click', onRetry);
}

// ═══════════════════════════════════════════════════════════════════
//  HEADER — LANGUAGE SWITCHER
// ═══════════════════════════════════════════════════════════════════

/** Reflect the active locale in the header button states. */
function syncLangUI() {
  const lang = getLang();
  document.querySelectorAll('.lang-btn').forEach(btn => {
    const active = btn.dataset.lang === lang;
    btn.setAttribute('aria-pressed', String(active));
    btn.classList.toggle('is-active', active);
  });
  document.documentElement.lang = lang;
}

/** Wire the three language buttons once at boot. */
function initLangSwitcher() {
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const next = btn.dataset.lang;
      if (next === getLang()) return;       // already active — no-op
      setLang(next);
      clearSectionCache();
      syncLangUI();
      // Re-render current route in the new language
      import('./router.js').then(m => m.route());
    });
  });
}


// ═══════════════════════════════════════════════════════════════════
//  THEME (light / dark)
// ═══════════════════════════════════════════════════════════════════

const THEME_KEY = 'theme';

/**
 * Apply the saved theme (or 'light' by default) to <html data-theme>.
 * Call once at boot before anything renders to avoid a flash.
 */
function applyTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'light';
  document.documentElement.dataset.theme = saved;
  _syncThemeBtn(saved);
}

/** Toggle between light and dark, persist the choice. */
function toggleTheme() {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem(THEME_KEY, next);
  _syncThemeBtn(next);
}

/** Update the button icon and aria-label to reflect current theme. */
function _syncThemeBtn(theme) {
  const btn = document.getElementById('js-theme-btn');
  if (!btn) return;
  const t = T[getLang()];
  if (theme === 'dark') {
    btn.textContent  = '☀️';
    btn.setAttribute('aria-label', t.themeLight);
    btn.title        = t.themeLight;
  } else {
    btn.textContent  = '🌙';
    btn.setAttribute('aria-label', t.themeDark);
    btn.title        = t.themeDark;
  }
}

// ═══════════════════════════════════════════════════════════════════
//  BOOT
// ═══════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  applyTheme();
  syncLangUI();
  initLangSwitcher();
  document.getElementById('js-theme-btn')
    ?.addEventListener('click', toggleTheme);
  initRouter();
});
