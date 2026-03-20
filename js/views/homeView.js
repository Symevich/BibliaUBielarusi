/**
 * homeView.js — Home page: hero banner + section list
 *
 * Route: index.html  (no query params)
 *
 * Improvements over previous version:
 *   • Accepts routeId from the router. After the async fetchSections()
 *     call, isCurrentRoute(routeId) is checked before writing to #app.
 *     This prevents a stale render from overwriting a newer navigation.
 *   • Spinner is only shown when sections.json has not yet been fetched
 *     this session, avoiding a flash for the common case of returning
 *     home from a section or object page.
 *   • 'use strict' removed — redundant in ES modules.
 */

import { getLang, T }                        from '../store.js';
import { getApp, setLoading, setError,
         fetchSections, buildPicture,
         hasSectionsCache }                  from '../app.js';
import { isCurrentRoute }                    from '../router.js';

// ─── Public ────────────────────────────────────────────────────────

/**
 * @param {number} routeId  Claimed by the router; used for stale-render guard.
 */
export async function renderHome(routeId) {
  const lang = getLang();
  const t    = T[lang];

  document.title = t.siteTitle;

  // Avoid spinner flash when returning to an already-cached home page
  if (!hasSectionsCache()) setLoading();

  try {
    const sections = await fetchSections();
    if (!isCurrentRoute(routeId)) return;   // navigation moved on — bail
    _paint(sections, lang, t);
  } catch (err) {
    console.error('[homeView]', err);
    if (isCurrentRoute(routeId)) setError(t.errorLoad, () => renderHome(routeId));
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
