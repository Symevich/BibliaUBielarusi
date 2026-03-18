/**
 * objectView.js — Single exhibit detail page
 *
 * Route: index.html?section=N&id=X
 *
 * Renders:
 *   1. Breadcrumb nav (All Sections → Section N)
 *   2. Exhibit title + provenance/date (loc.info)
 *   3. Image — single <picture> or multi-image carousel (_p1/_p2…)
 *   4. Audio play button (only when obj.audio is non-empty)
 *   5. Description text (HTML trusted from the content team)
 *   6. Prev / Next navigation within the section
 *
 * Data quirks handled:
 *   • obj.id is sometimes a string ("1A", "intro_1") and sometimes a
 *     number (31). All comparisons use String().
 *   • img is always an array.  _ico.webp entries are thumbnails only —
 *     they are stripped before building the carousel.
 *   • obj.audio is a bare filename (e.g. "track-5.mp3") or an empty
 *     string.  We prepend "assets/audio/" here.
 *   • Section 0 is the Preface: one object, id="0". Its back link
 *     goes to the home page, not to a section listing.
 *
 * Audio:
 *   Clicking the trigger button calls player.load(), which resumes
 *   from the current position if the same src is already buffered.
 *   Audio is NEVER auto-played (WCAG 1.4.2).
 *   The button's visual state (play ↔ pause icon) is managed by
 *   toggling the CSS class .is-playing — no DOM hidden attribute.
 */

'use strict';

import { getLang, T }               from '../store.js';
import { getApp, setLoading, setError,
         fetchSection, buildCarousel,
         initCarousel, splitImages } from '../app.js';
import { load as playerLoad,
         toggle as playerToggle,
         isPlaying, currentSrc }    from '../player.js';

// ─── Public ────────────────────────────────────────────────────────

/**
 * @param {string} sectionId  e.g. "3"
 * @param {string} objectId   e.g. "21" or "1A" or "intro_1"
 */
export async function renderObject(sectionId, objectId) {
  const lang = getLang();
  const t    = T[lang];

  document.title = t.siteTitle;
  setLoading();

  try {
    const objects = await fetchSection(sectionId, lang);
    const idx     = objects.findIndex(o => String(o.id) === String(objectId));

    if (idx === -1) {
      getApp().innerHTML = `
        <div class="view">
          <nav class="breadcrumb">
            <a class="breadcrumb__link" href="index.html">← ${t.allSections}</a>
          </nav>
          <p class="notice notice--error">${t.notFound}</p>
        </div>`;
      return;
    }

    const obj  = objects[idx];
    const prev = idx > 0                  ? objects[idx - 1] : null;
    const next = idx < objects.length - 1 ? objects[idx + 1] : null;

    _paint(obj, prev, next, sectionId, lang, t);

  } catch (err) {
    console.error('[objectView]', err);
    setError(t.errorLoad, () => renderObject(sectionId, objectId));
  }
}

// ─── Private ───────────────────────────────────────────────────────

function _paint(obj, prev, next, sectionId, lang, t) {
  const loc       = obj[lang] ?? obj.be;
  const isPreface = sectionId === '0';

  document.title = `${loc.title} — ${t.siteTitle}`;

  // Back link destination
  const backHref  = isPreface ? 'index.html' : `index.html?section=${sectionId}`;
  const backLabel = isPreface ? `← ${t.allSections}` : t.backToSection;

  // Images
  const { display } = splitImages(obj.img);
  const mediaHTML   = buildCarousel(display, loc.title || t.altImage);

  // Audio
  const audioFile = (obj.audio || '').trim();
  const audioSrc  = audioFile ? `assets/audio/${audioFile}` : '';

  // Provenance / date line
  const infoHTML = loc.info
    ? `<p class="object-detail__info">${loc.info}</p>`
    : '';

  // Prev / Next buttons
  const prevHTML = _navBtn(prev, sectionId, lang, 'prev', t);
  const nextHTML = _navBtn(next, sectionId, lang, 'next', t);

  getApp().innerHTML = `
    <div class="view view--object">

      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a class="breadcrumb__link" href="index.html">${t.allSections}</a>
        ${!isPreface ? `
          <span class="breadcrumb__sep" aria-hidden="true">›</span>
          <a class="breadcrumb__link" href="index.html?section=${sectionId}">
            ${t.section} ${sectionId}
          </a>` : ''}
      </nav>

      <article class="object-detail" aria-labelledby="obj-title">

        <h1 class="object-detail__title" id="obj-title">${loc.title}</h1>
        ${infoHTML}

        <div class="object-detail__media">${mediaHTML}</div>

        ${audioSrc ? _audioBtn(audioSrc, loc.title, t) : ''}

        <div class="object-detail__text prose">${loc.text || ''}</div>

      </article>

      <nav class="obj-nav" aria-label="${t.section} navigation">
        ${prevHTML}
        <a class="obj-nav__back" href="${backHref}">${backLabel}</a>
        ${nextHTML}
      </nav>

    </div>`;

  // Post-render wiring
  initCarousel(getApp());
  if (audioSrc) _wireAudioBtn(audioSrc, loc.title, t);
}

/**
 * Build a prev or next navigation button.
 * Returns an empty <span> when there is no adjacent object.
 */
function _navBtn(obj, sectionId, lang, dir, t) {
  if (!obj) return '<span></span>';
  const loc   = obj[lang] ?? obj.be;
  const href  = `index.html?section=${sectionId}&id=${obj.id}`;
  const label = dir === 'prev' ? t.prev : t.next;
  const arrow = dir === 'prev' ? '‹' : '›';
  return `
    <a class="obj-nav__btn obj-nav__btn--${dir}"
       href="${href}"
       aria-label="${label}: ${loc.title}">
      ${dir === 'prev' ? `<span class="obj-nav__arrow">${arrow}</span>` : ''}
      <span class="obj-nav__label">${label}</span>
      ${dir === 'next' ? `<span class="obj-nav__arrow">${arrow}</span>` : ''}
    </a>`;
}

/**
 * Build the audio trigger button HTML.
 *
 * The button uses .is-playing class to switch between play/pause icons
 * via CSS — matching the approach used in the footer player bar.
 * This makes the initial state correct if the user navigated away and
 * back while the same track was already playing.
 *
 * @param {string} src
 * @param {string} title
 * @param {object} t
 */
function _audioBtn(src, title, t) {
  // Determine initial state: is this track already playing?
  const playing = isPlaying() && currentSrc().endsWith(src);
  const label   = playing ? t.pauseAudio : t.playAudio;

  return `
    <div class="audio-trigger">
      <button class="audio-trigger__btn${playing ? ' is-playing' : ''}"
              id="js-audio-btn"
              aria-label="${label}"
              aria-pressed="${playing}">
        <svg class="audio-trigger__icon audio-trigger__icon--play"
             viewBox="0 0 24 24" aria-hidden="true">
          <polygon points="5,3 19,12 5,21"/>
        </svg>
        <svg class="audio-trigger__icon audio-trigger__icon--pause"
             viewBox="0 0 24 24" aria-hidden="true">
          <rect x="6" y="4" width="4" height="16"/>
          <rect x="14" y="4" width="4" height="16"/>
        </svg>
        <span class="audio-trigger__label">${label}</span>
      </button>
    </div>`;
}

/**
 * Attach the click handler to the audio trigger button.
 * Must be called after the HTML is in the DOM.
 *
 * @param {string} src
 * @param {string} title
 * @param {object} t
 */
function _wireAudioBtn(src, title, t) {
  const btn = document.getElementById('js-audio-btn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    // Re-check state at click time (user may have used the footer controls)
    const playing = isPlaying() && currentSrc().endsWith(src);

    if (playing) {
      playerToggle();                             // pause
      btn.classList.remove('is-playing');
      btn.setAttribute('aria-pressed', 'false');
      btn.setAttribute('aria-label', t.playAudio);
      btn.querySelector('.audio-trigger__label').textContent = t.playAudio;
    } else {
      playerLoad(src, title);                     // play (or resume)
      btn.classList.add('is-playing');
      btn.setAttribute('aria-pressed', 'true');
      btn.setAttribute('aria-label', t.pauseAudio);
      btn.querySelector('.audio-trigger__label').textContent = t.pauseAudio;
    }
  });
}
