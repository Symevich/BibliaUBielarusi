/**
 * homeView.js — Home page: hero banner + section list
 *
 * Route: index.html  (no query params)
 *
 * Renders sections as the same list-row style as object cards:
 * circular cover image + title + object count + chevron.
 */

'use strict';

import { getLang, T }                 from '../store.js';
import { getApp, setLoading, setError,
         fetchSections, buildPicture } from '../app.js';

// ─── Public ────────────────────────────────────────────────────────

export async function renderHome() {
  const lang = getLang();
  const t    = T[lang];

  document.title = t.siteTitle;
  setLoading();

  try {
    const sections = await fetchSections();
    _paint(sections, lang, t);
  } catch (err) {
    console.error('[homeView]', err);
    setError(t.errorLoad, renderHome);
  }
}

// ─── Private ───────────────────────────────────────────────────────

function _paint(sections, lang, t) {
  const rows = sections.map(s => _row(s, lang, t)).join('');

  getApp().innerHTML = `
    <div class="view view--home">
      <section class="hero">
        <h1 class="hero__title">${t.siteTitle}</h1>
        <p class="hero__subtitle">${t.siteSubtitle}</p>
      </section>
      <ul class="object-grid" role="list" aria-label="${t.allSections}">${rows}</ul>
    </div>`;
}

/**
 * Build one section row — same markup as an object card so it
 * shares all .object-card* CSS without duplication.
 *
 * @param {object} sec  Entry from sections.json
 * @param {string} lang
 * @param {object} t
 */
function _row(sec, lang, t) {
  const title     = sec.title[lang] ?? sec.title.be;
  const isPreface = sec.id === 0;
  const href      = isPreface
    ? 'index.html?section=0&id=0'
    : `index.html?section=${sec.id}`;

  const coverHTML = sec.cover
    ? buildPicture(sec.cover, title, 'object-card__thumb', true)
    : '<div class="object-card__thumb--empty"></div>';

  const subtitleHTML = isPreface
    ? `<span class="object-card__info">${t.preface}</span>`
    : `<span class="object-card__info">${t.section} ${sec.id}</span>`;

  return `
    <li>
      <a class="object-card" href="${href}" aria-label="${title}">
        <div class="object-card__img-wrap">${coverHTML}</div>
        <div class="object-card__body">
          ${subtitleHTML}
          <h2 class="object-card__title">${title}</h2>
        </div>
        <span class="object-card__arrow" aria-hidden="true">›</span>
      </a>
    </li>`;
}
