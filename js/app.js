/**
 * app.js — Biblia ў Belarusi / Bible in Belarus
 *
 * Single script for the entire site. Page role is determined by
 * data-page attribute on <body>:
 *
 *   data-page="home"    → welcome / landing page (no logic needed)
 *   data-page="index"   → section menu
 *   data-page="section" → exhibit list  (?section=N)
 *   data-page="exhibit" → exhibit detail (?section=N&id=X)
 *
 * Locale is stored in localStorage and toggled by the lang switch.
 * Defaults to 'en'.
 */

'use strict';

/* ═══════════════════════════════════════════════════════════════════
   LOCALE
═══════════════════════════════════════════════════════════════════ */

const LOCALE_KEY = 'locale';

function getLocale() {
  return localStorage.getItem(LOCALE_KEY) || 'en';
}

function setLocale(lang) {
  localStorage.setItem(LOCALE_KEY, lang);
}

/* ═══════════════════════════════════════════════════════════════════
   TRANSLATIONS
═══════════════════════════════════════════════════════════════════ */

const T = {
  be: {
    siteTitle:       'Біблія ў Беларусі',
    siteSubtitle:    'Віртуальная выстава',
    start:           'Пачатак',
    backToHome:      '← На галоўную',
    backToSections:  '← Выбар секцый',
    backToSection:   '← Назад у секцыю',
    section:         'Секцыя',
    exhibit:         'Экспанат',
    preface:         'Прадмова',
    notFound:        'Экспанат не знойдзены.',
    emptySection:    'У гэтай секцыі няма экспанатаў.',
    loadError:       'Памылка загрузкі.',
    missingParams:   'Не зададзены патрэбныя параметры.',
    altPhoto:        'Фота экспаната',
    altThumb:        'Іконка экспаната',
    altSection:      'Іконка секцыі',
    sections: [
      'ПРАДМОВА',
      'НАРАДЖЭННЕ БІБЛІІ',
      'ІСУС ХРЫСТОС І ЯГО ВУЧНІ',
      'РУКАПІСНЫЯ БІБЛІІ',
      'ФРАНЦЫСК СКАРЫНА І ЭПОХА РЭФАРМАЦЫІ',
      'СУЧАСНЫЯ БЕЛАРУСКІЯ ПЕРАКЛАДЫ БІБЛІІ',
    ],
  },
  en: {
    siteTitle:       'Bible in Belarus',
    siteSubtitle:    'Virtual exhibition',
    start:           'Start',
    backToHome:      '← Back to Home',
    backToSections:  '← Section selection',
    backToSection:   '← Back to section',
    section:         'Section',
    exhibit:         'Exhibit',
    preface:         'Preface',
    notFound:        'Exhibit not found.',
    emptySection:    'This section has no exhibits.',
    loadError:       'Error loading data.',
    missingParams:   'Required parameters are missing.',
    altPhoto:        'Exhibit photo',
    altThumb:        'Exhibit icon',
    altSection:      'Section icon',
    sections: [
      'PREFACE',
      'THE BIRTH OF THE BIBLE',
      'JESUS CHRIST AND HIS DISCIPLES',
      'MANUSCRIPT BIBLES',
      'FRANCISK SKARYNA AND THE REFORMATION ERA',
      'MODERN BELARUSIAN BIBLE TRANSLATIONS',
    ],
  },
};

/* ═══════════════════════════════════════════════════════════════════
   CATALOG
═══════════════════════════════════════════════════════════════════ */

let catalogCache = null;

async function loadCatalog() {
  if (catalogCache) return catalogCache;
  const res = await fetch('json/catalog.json');
  if (!res.ok) throw new Error(`Catalog fetch failed: ${res.status}`);
  catalogCache = await res.json();
  return catalogCache;
}

function findExhibit(catalog, section, id) {
  return catalog.find(
    (e) => String(e.section) === String(section) && String(e.id) === String(id)
  );
}

function getSection(catalog, section) {
  return catalog.filter((e) => String(e.section) === String(section));
}

/* ═══════════════════════════════════════════════════════════════════
   IMAGE HELPERS
═══════════════════════════════════════════════════════════════════ */

function toArray(val) {
  if (!val) return [];
  return (Array.isArray(val) ? val : [val]).filter(Boolean);
}

function thumbnail(images) {
  return images.find((s) => s.includes('_ico.')) || images[0] || '';
}

function displayImages(images) {
  return images.filter((s) => !s.includes('_ico.'));
}

/* ═══════════════════════════════════════════════════════════════════
   CAROUSEL
═══════════════════════════════════════════════════════════════════ */

function buildCarousel(images, altText) {
  const slides = images
    .map((src) => `<div class="carousel__slide"><img src="${src}" alt="${altText}" loading="lazy"></div>`)
    .join('');

  const dots = images
    .map((_, i) => `<span class="carousel__dot${i === 0 ? ' carousel__dot--active' : ''}"></span>`)
    .join('');

  return `
    <div class="carousel">
      <div class="carousel__track" tabindex="0">${slides}</div>
      <button class="carousel__btn carousel__btn--prev" aria-label="Previous">&#10094;</button>
      <button class="carousel__btn carousel__btn--next" aria-label="Next">&#10095;</button>
      <div class="carousel__dots">${dots}</div>
    </div>`;
}

function initCarousel() {
  const track = document.querySelector('.carousel__track');
  if (!track) return;

  const slides   = track.children;
  const dotsWrap = document.querySelector('.carousel__dots');
  const dots     = dotsWrap ? Array.from(dotsWrap.children) : [];
  let idx = 0;

  function goTo(n) {
    idx = (n + slides.length) % slides.length;
    track.style.transform = `translateX(-${idx * 100}%)`;
    dots.forEach((d, i) => d.classList.toggle('carousel__dot--active', i === idx));
  }

  document.querySelector('.carousel__btn--prev')?.addEventListener('click', () => goTo(idx - 1));
  document.querySelector('.carousel__btn--next')?.addEventListener('click', () => goTo(idx + 1));

  dotsWrap?.addEventListener('click', (e) => {
    const dot = e.target.closest('.carousel__dot');
    if (dot) goTo(dots.indexOf(dot));
  });

  track.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft')  goTo(idx - 1);
    if (e.key === 'ArrowRight') goTo(idx + 1);
  });

  goTo(0);
}

/* ═══════════════════════════════════════════════════════════════════
   NAV — shared header rendered on every page
═══════════════════════════════════════════════════════════════════ */

/**
 * @param {object} opts
 * @param {string} [opts.backHref]   - href for the back button; omit to hide it
 * @param {string} [opts.backLabel]  - label for the back button
 */
function renderNav({ backHref, backLabel } = {}) {
  const locale = getLocale();
  const nav    = document.getElementById('js-nav');
  if (!nav) return;

  const backHTML = backHref
    ? `<div class="nav__back"><a href="${backHref}" class="nav__back-btn">${backLabel}</a></div>`
    : '<div class="nav__back"></div>';

  // Clicking a lang button: save locale then reload so page re-renders in new lang
  nav.innerHTML = `
    ${backHTML}
    <div class="nav__lang-switch">
      <button class="nav__lang-btn${locale === 'be' ? ' nav__lang-btn--active' : ''}"
              data-lang="be">Беларуская</button>
      <button class="nav__lang-btn${locale === 'en' ? ' nav__lang-btn--active' : ''}"
              data-lang="en">English</button>
    </div>`;

  nav.querySelectorAll('[data-lang]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setLocale(btn.dataset.lang);
      location.reload();
    });
  });
}

/* ═══════════════════════════════════════════════════════════════════
   PAGES
═══════════════════════════════════════════════════════════════════ */

/* ── Home (index.html) ──────────────────────────────────────────── */
function renderHome() {
  const locale = getLocale();
  const t      = T[locale];

  renderNav();

  document.querySelector('.welcome__title').textContent    = t.siteTitle;
  document.querySelector('.welcome__subtitle').textContent = t.siteSubtitle;
  document.querySelector('.welcome__btn').textContent      = t.start;
  document.title = t.siteTitle;
}

/* ── Section index (sections.html) ─────────────────────────────── */

// Static section data: [sectionNumber, imgFile]
const SECTION_INDEX = [
  [0, 'img/79.webp'],   // preface
  [1, 'img/5.webp'],
  [2, 'img/14.webp'],
  [3, 'img/21.webp'],
  [4, 'img/33.webp'],
  [5, 'img/75.webp'],
];

function renderSectionIndex() {
  const locale = getLocale();
  const t      = T[locale];

  renderNav({ backHref: 'index.html', backLabel: t.backToHome });

  document.querySelector('.page-title').textContent = t.siteTitle;
  document.title = t.siteTitle;

  const list = document.getElementById('js-list');
  list.innerHTML = SECTION_INDEX.map(([sec, img]) => {
    const isPreface = sec === 0;
    const href      = isPreface
      ? `exhibit.html?section=0&id=0`
      : `section.html?section=${sec}`;
    const labelHTML = isPreface
      ? ''
      : `<p class="exhibit-card__label">${t.section} ${sec}</p>`;

    return `
      <li>
        <a href="${href}" class="exhibit-card">
          <div class="exhibit-card__thumb">
            <img src="${img}" alt="${t.altSection}" class="exhibit-card__thumbnail">
          </div>
          <div class="exhibit-card__info">
            ${labelHTML}
            <h3 class="exhibit-card__title">${t.sections[sec]}</h3>
          </div>
        </a>
      </li>`;
  }).join('');
}

/* ── Section listing (section.html) ────────────────────────────── */
async function renderSection() {
  const locale  = getLocale();
  const t       = T[locale];
  const params  = new URLSearchParams(location.search);
  const section = params.get('section');

  renderNav({ backHref: 'sections.html', backLabel: t.backToSections });

  const titleEl = document.getElementById('js-title');
  const listEl  = document.getElementById('js-list');

  if (!section) {
    titleEl.textContent = '';
    listEl.innerHTML    = `<p class="notice notice--error">${t.missingParams}</p>`;
    return;
  }

  document.title = titleEl.textContent = `${t.section} ${section}`;

  try {
    const catalog  = await loadCatalog();
    const exhibits = getSection(catalog, section);

    if (!exhibits.length) {
      listEl.innerHTML = `<p class="notice">${t.emptySection}</p>`;
      return;
    }

    listEl.innerHTML = exhibits.map((e) => {
      const isIntro   = typeof e.id === 'string' && e.id.startsWith('intro_');
      const labelHTML = isIntro
        ? `<p class="exhibit-card__label">${t.preface}</p>`
        : `<p class="exhibit-card__label">${t.exhibit} ${e.id}</p>`;

      const imgs   = toArray(e.img);
      const thumb  = thumbnail(imgs);
      const thumbHTML = thumb
        ? `<img src="${thumb}" alt="${t.altThumb}" class="exhibit-card__thumbnail" loading="lazy">`
        : '';

      return `
        <li>
          <a href="exhibit.html?section=${e.section}&id=${e.id}" class="exhibit-card">
            <div class="exhibit-card__thumb">${thumbHTML}</div>
            <div class="exhibit-card__info">
              ${labelHTML}
              <h3 class="exhibit-card__title">${e[locale].title}</h3>
            </div>
          </a>
        </li>`;
    }).join('');

  } catch (err) {
    console.error('[section]', err);
    listEl.innerHTML = `<p class="notice notice--error">${t.loadError}</p>`;
  }
}

/* ── Exhibit detail (exhibit.html) ─────────────────────────────── */
async function renderExhibit() {
  const locale  = getLocale();
  const t       = T[locale];
  const params  = new URLSearchParams(location.search);
  const section = params.get('section');
  const id      = params.get('id');

  const contentEl = document.getElementById('js-content');

  const isPreface = section === '0' && id === '0';
  renderNav({
    backHref:  isPreface ? 'sections.html' : `section.html?section=${section}`,
    backLabel: isPreface ? t.backToSections : t.backToSection,
  });

  if (!section || !id) {
    contentEl.innerHTML = `<p class="notice notice--error">${t.missingParams}</p>`;
    return;
  }

  try {
    const catalog = await loadCatalog();
    const exhibit = findExhibit(catalog, section, id);

    if (!exhibit) {
      contentEl.innerHTML = `<p class="notice notice--error">${t.notFound}</p>`;
      return;
    }

    const loc = exhibit[locale];
    document.title = loc.title;

    const imgs    = displayImages(toArray(exhibit.img));
    const imgHTML = imgs.length === 0 ? ''
      : imgs.length === 1
        ? `<img src="${imgs[0]}" alt="${t.altPhoto}" class="exhibit__image" loading="lazy">`
        : buildCarousel(imgs, t.altPhoto);

    const infoHTML  = loc.info  ? `<p class="exhibit__meta">${loc.info}</p>`                  : '';
    const audioHTML = exhibit.audio ? `<audio src="${exhibit.audio}" class="exhibit__audio" controls></audio>` : '';

    contentEl.innerHTML = `
      <h3 class="exhibit__title">${loc.title}</h3>
      ${infoHTML}
      ${imgHTML}
      ${audioHTML}
      <div class="exhibit__body">${loc.text}</div>`;

    initCarousel();

  } catch (err) {
    console.error('[exhibit]', err);
    contentEl.innerHTML = `<p class="notice notice--error">${t.loadError}</p>`;
  }
}

/* ═══════════════════════════════════════════════════════════════════
   ROUTER — dispatch based on data-page
═══════════════════════════════════════════════════════════════════ */

const PAGE = document.body.dataset.page;

if      (PAGE === 'home')     renderHome();
else if (PAGE === 'index')    renderSectionIndex();
else if (PAGE === 'section')  renderSection();
else if (PAGE === 'exhibit')  renderExhibit();
