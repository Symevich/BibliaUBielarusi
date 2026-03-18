/**
 * sectionView.js — Section listing page
 *
 * Route: index.html?section=N
 *
 * Data conventions in the real JSON files:
 *   • Every section-N.json starts with exactly one "intro" object.
 *     Its id is "intro_N" (sections 1–5) or "0" (section 0).
 *     This intro is rendered as the section header, not as an exhibit card.
 *   • Remaining objects are the actual exhibits — id can be a string
 *     ("1A", "1B") or a number (2, 3 …).
 *   • Some objects have a _ico.webp image as the first entry in img[]:
 *     this is the list thumbnail; the full image(s) follow.
 *   • loc.info holds a date/provenance line (may be empty string).
 *
 * The intro text for section 5 is very long (~3000 chars). A
 * "read more / read less" toggle is added when it exceeds 600 chars.
 */

'use strict';

import { getLang, T }                from '../store.js';
import { getApp, setLoading, setError,
         fetchSection, buildPicture,
         splitImages }               from '../app.js';

// Characters before "read more" clamp kicks in
const INTRO_CLAMP = 600;

// ─── Public ────────────────────────────────────────────────────────

/** @param {string} sectionId  URL param value, e.g. "3" */
export async function renderSection(sectionId) {
  const lang = getLang();
  const t    = T[lang];

  document.title = `${t.section} ${sectionId} — ${t.siteTitle}`;
  setLoading();

  try {
    const objects = await fetchSection(sectionId, lang);
    _paint(objects, sectionId, lang, t);
  } catch (err) {
    console.error('[sectionView]', err);
    setError(t.errorLoad, () => renderSection(sectionId));
  }
}

// ─── Private ───────────────────────────────────────────────────────

function _paint(objects, sectionId, lang, t) {
  if (!objects.length) {
    getApp().innerHTML = `<div class="view"><p class="notice">${t.noObjects}</p></div>`;
    return;
  }

  // First object is always the intro
  const intro    = objects[0];
  const exhibits = objects.slice(1);
  const loc      = intro[lang] ?? intro.be;

  document.title = `${loc.title} — ${t.siteTitle}`;

  // Build intro text with optional read-more toggle
  const rawText  = loc.text || '';
  const needsToggle = rawText.length > INTRO_CLAMP;
  const introText = needsToggle
    ? _collapsibleText(rawText, t)
    : rawText ? `<div class="section-intro__text prose">${rawText}</div>` : '';

  const cardsHTML = exhibits.length
    ? `<ul class="object-grid" role="list">${exhibits.map(o => _card(o, sectionId, lang, t)).join('')}</ul>`
    : `<p class="notice">${t.noObjects}</p>`;

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
    </div>`;

  // Wire the read-more toggle if it was rendered
  if (needsToggle) _wireToggle(t);
}

/**
 * Wrap a long text in a collapsible container.
 * The collapsed state shows the first INTRO_CLAMP characters.
 */
function _collapsibleText(html, t) {
  return `
    <div class="section-intro__text prose collapsible" data-collapsible>
      <div class="collapsible__body" data-body>${html}</div>
      <button class="collapsible__toggle" data-toggle
              aria-expanded="false">${t.readMore}</button>
    </div>`;
}

/** Attach the expand/collapse handler after HTML is in the DOM. */
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

/**
 * Build one exhibit card in the list.
 * @param {object} obj
 * @param {string} sectionId
 * @param {string} lang
 * @param {object} t
 */
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
