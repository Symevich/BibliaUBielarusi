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
 *       buildCarousel()    multi-image carousel HTML string
 *       initCarousel()     wire carousel controls after DOM insertion
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
 *   display — images without _ico, shown in the detail view / carousel
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
//  CAROUSEL
// ═══════════════════════════════════════════════════════════════════

/**
 * Build carousel HTML for an array of resolved image paths.
 * For a single image, returns a plain <picture> (no carousel chrome).
 * Call initCarousel(root) after inserting the HTML into the DOM.
 *
 * @param {string[]} images
 * @param {string}   alt
 * @returns {string}
 */
export function buildCarousel(images, alt) {
  if (!images.length) return '';
  if (images.length === 1) {
    return buildPicture(images[0], alt, 'object-image', false);
  }

  const slides = images.map((src, i) => `
    <div class="carousel__slide">
      ${buildPicture(src, `${alt} (${i + 1}/${images.length})`, 'carousel__img', i > 0)}
    </div>`).join('');

  const dots = images.map((_, i) => `
    <button class="carousel__dot${i === 0 ? ' is-active' : ''}"
            aria-label="Image ${i + 1}"
            data-index="${i}"></button>`).join('');

  return `
    <div class="carousel" data-carousel>
      <div class="carousel__track">${slides}</div>
      <button class="carousel__btn carousel__btn--prev" aria-label="Previous">&#8249;</button>
      <button class="carousel__btn carousel__btn--next" aria-label="Next">&#8250;</button>
      <div class="carousel__dots" role="tablist">${dots}</div>
    </div>`;
}

/**
 * Wire carousel controls after its HTML is in the DOM.
 * @param {Document|HTMLElement} [root]
 */
export function initCarousel(root = document) {
  const el = root.querySelector('[data-carousel]');
  if (!el) return;

  const track = el.querySelector('.carousel__track');
  const dots  = Array.from(el.querySelectorAll('.carousel__dot'));
  const total = dots.length;
  let cur = 0;

  function goTo(n) {
    cur = ((n % total) + total) % total;
    track.style.transform = `translateX(-${cur * 100}%)`;
    dots.forEach((d, i) => d.classList.toggle('is-active', i === cur));
  }

  el.querySelector('.carousel__btn--prev')?.addEventListener('click', () => goTo(cur - 1));
  el.querySelector('.carousel__btn--next')?.addEventListener('click', () => goTo(cur + 1));
  dots.forEach(d => d.addEventListener('click', () => goTo(Number(d.dataset.index))));

  // Touch swipe
  let sx = 0;
  track.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend',   e => {
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 44) goTo(dx < 0 ? cur + 1 : cur - 1);
  });

  // Keyboard
  el.setAttribute('tabindex', '0');
  el.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft')  goTo(cur - 1);
    if (e.key === 'ArrowRight') goTo(cur + 1);
  });
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
//  BOOT
// ═══════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  syncLangUI();
  initLangSwitcher();
  initRouter();
});
