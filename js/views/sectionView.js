/**
 * sectionView.js — Section listing page
 *
 * Route: index.html?section=N
 *
 * Improvements over previous version:
 *   • Accepts routeId; checks isCurrentRoute() after every await so a
 *     rapid navigation never writes stale content to #app.
 *   • Spinner skipped when the section data is already in the cache —
 *     returning to a visited section is now instant and flash-free.
 *   • 'use strict' removed — redundant in ES modules.
 */

import { getLang, T, getCachedSection }    from '../store.js';
import { getApp, setLoading, setError,
         fetchSections, fetchSection,
         buildPicture, splitImages }       from '../app.js';
import { isCurrentRoute }                  from '../router.js';

const INTRO_CLAMP = 600; // characters; intro text longer than this gets a toggle

// ─── Public ────────────────────────────────────────────────────────

/**
 * @param {string} sectionId  URL param value, e.g. "3"
 * @param {number} routeId    Claimed by the router; stale-render guard.
 */
export async function renderSection(sectionId, routeId) {
  const lang = getLang();
  const t    = T[lang];

  document.title = `${t.section} ${sectionId} — ${t.siteTitle}`;

  // Skip spinner flash for cached navigations
  if (!getCachedSection(sectionId, lang)) setLoading();

  try {
    const [objects, allSections] = await Promise.all([
      fetchSection(sectionId, lang),
      fetchSections(),
    ]);
    if (!isCurrentRoute(routeId)) return;
    _paint(objects, sectionId, allSections, lang, t);
  } catch (err) {
    console.error('[sectionView]', err);
    if (isCurrentRoute(routeId)) {
      setError(t.errorLoad, () => renderSection(sectionId, routeId));
    }
  }
}

// ─── Private ───────────────────────────────────────────────────────

function _paint(objects, sectionId, allSections, lang, t) {
  if (!objects.length) {
    getApp().innerHTML = `<div class="view"><p class="notice">${t.noObjects}</p></div>`;
    return;
  }

  const intro    = objects[0];
  const exhibits = objects.slice(1);
  const loc      = intro[lang] ?? intro.be;

  // Update document title to section's actual title once data arrives
  document.title = `${loc.title} — ${t.siteTitle}`;

  const rawText     = loc.text || '';
  const needsToggle = rawText.length > INTRO_CLAMP;
  const introText   = needsToggle
    ? _collapsibleText(rawText, t)
    : rawText
      ? `<div class="section-intro__text prose">${rawText}</div>`
      : '';

  const cardsHTML = exhibits.length
    ? `<ul class="object-grid" role="list">
        ${exhibits.map(o => _card(o, sectionId, lang, t)).join('')}
       </ul>`
    : `<p class="notice">${t.noObjects}</p>`;

  const navHTML = _sectionNav(allSections, Number(sectionId), lang, t);

  getApp().innerHTML = `
    <div class="view view--section">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a class="breadcrumb__link" href="index.html">← ${t.allSections}</a>
      </nav>
      <header class="section-intro">
        <h1 class="section-intro__title">${loc.title}</h1>
        ${introText}
      </header>
      ${cardsHTML}
      ${navHTML}
    </div>`;

  if (needsToggle) _wireToggle(t);
}

/**
 * Prev / Home / Next navigation bar.
 * Only sections with id > 0 are included in the sequence (0 = Preface).
 */
function _sectionNav(allSections, currentId, lang, t) {
  const seq = allSections.filter(s => s.id > 0);
  const idx = seq.findIndex(s => s.id === currentId);

  // Section 0 (Preface) gets only a "back to all" link — no prev/next
  if (idx === -1) {
    return `
      <nav class="obj-nav" aria-label="Section navigation">
        <span></span>
        <a class="obj-nav__back" href="index.html">← ${t.allSections}</a>
        <span></span>
      </nav>`;
  }

  const prev = idx > 0             ? seq[idx - 1] : null;
  const next = idx < seq.length - 1 ? seq[idx + 1] : null;

  const prevHTML = prev
    ? `<a class="obj-nav__btn obj-nav__btn--prev"
          href="index.html?section=${prev.id}"
          aria-label="${t.prevSection}: ${prev.title[lang] ?? prev.title.be}">
         <span class="obj-nav__arrow">‹</span>
         <span class="obj-nav__label">${prev.title[lang] ?? prev.title.be}</span>
       </a>`
    : '<span></span>';

  const nextHTML = next
    ? `<a class="obj-nav__btn obj-nav__btn--next"
          href="index.html?section=${next.id}"
          aria-label="${t.nextSection}: ${next.title[lang] ?? next.title.be}">
         <span class="obj-nav__label">${next.title[lang] ?? next.title.be}</span>
         <span class="obj-nav__arrow">›</span>
       </a>`
    : '<span></span>';

  return `
    <nav class="obj-nav" aria-label="Section navigation">
      ${prevHTML}
      <a class="obj-nav__back" href="index.html">← ${t.allSections}</a>
      ${nextHTML}
    </nav>`;
}

function _collapsibleText(html, t) {
  return `
    <div class="section-intro__text prose collapsible" data-collapsible>
      <div class="collapsible__body" data-body>${html}</div>
      <button class="collapsible__toggle" data-toggle
              aria-expanded="false">${t.readMore}</button>
    </div>`;
}

function _wireToggle(t) {
  const wrap   = getApp().querySelector('[data-collapsible]');
  const toggle = wrap?.querySelector('[data-toggle]');
  if (!wrap || !toggle) return;

  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    wrap.classList.toggle('is-expanded', !expanded);
    toggle.setAttribute('aria-expanded', String(!expanded));
    toggle.textContent = expanded ? t.readMore : t.readLess;
  });
}

function _card(obj, sectionId, lang, t) {
  const loc  = obj[lang] ?? obj.be;
  const href = `index.html?section=${sectionId}&id=${obj.id}`;
  const { thumb } = splitImages(obj.img);

  const thumbHTML = thumb
    ? buildPicture(thumb, loc.title, 'object-card__thumb', true)
    : '<div class="object-card__thumb object-card__thumb--empty"></div>';

  const infoHTML = loc.info
    ? `<span class="object-card__info">${loc.info}</span>`
    : '';

  return `
    <li>
      <a class="object-card" href="${href}" aria-label="${loc.title}">
        <div class="object-card__img-wrap">${thumbHTML}</div>
        <div class="object-card__body">
          <span class="object-card__num">${t.exhibit} ${obj.id}</span>
          <h2 class="object-card__title">${loc.title}</h2>
          ${infoHTML}
        </div>
        <span class="object-card__arrow" aria-hidden="true">›</span>
      </a>
    </li>`;
}
