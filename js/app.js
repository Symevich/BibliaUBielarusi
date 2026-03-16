/**
 * app.js — Biblia ŭ Bielarusi / Bible in Belarus
 *
 * Hash-based SPA:
 *   #home            → welcome / landing page
 *   #index           → section menu
 *   #section/N       → exhibit list for section N
 *   #exhibit/N/X     → exhibit detail for section N, id X
 *
 * Locale stored in localStorage (default: 'en').
 * Data: json/sections/section_{N}_{lang}.json
 */

'use strict';

/* ── Locale ──────────────────────────────────────────────────────── */

function getLocale() { return localStorage.getItem('locale') || 'en'; }
function setLocale(lang) { localStorage.setItem('locale', lang); }

/* ── Translations ────────────────────────────────────────────────── */

const T = {
  be: {
    siteTitle:      'Біблія ў Беларусі',
    siteSubtitle:   'Віртуальная выстава',
    start:          'Пачатак',
    backToHome:     '← На галоўную',
    backToSections: '← Выбар секцый',
    backToSection:  '← Назад у секцыю',
    section:        'Секцыя',
    exhibit:        'Экспанат',
    preface:        'Прадмова',
    notFound:       'Экспанат не знойдзены.',
    emptySection:   'У гэтай секцыі няма экспанатаў.',
    loadErrorDetail:'Не ўдалося загрузіць дадзеныя. Праверце сваё злучэнне з Інтэрнэтам.',
    loadError:      'Памылка загрузкі даных.',
    retry:          'Паўтарыць',
    altPhoto:       'Фота экспаната',
    altThumb:       'Іконка экспаната',
    altSection:     'Іконка секцыі',
    openFullscreen: 'Адкрыць у поўнаэкранным рэжыме',
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
    siteTitle:      'Bible in Belarus',
    siteSubtitle:   'Virtual exhibition',
    start:          'Start',
    backToHome:     '← Back to Home',
    backToSections: '← Section selection',
    backToSection:  '← Back to section',
    section:        'Section',
    exhibit:        'Exhibit',
    preface:        'Preface',
    notFound:       'Exhibit not found.',
    emptySection:   'This section has no exhibits.',
    loadErrorDetail:'Failed to load data. Please check your internet connection.',
    loadError:      'Error loading data.',
    retry:          'Retry',
    altPhoto:       'Exhibit photo',
    altThumb:       'Exhibit icon',
    altSection:     'Section icon',
    openFullscreen: 'Open fullscreen',
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

/* ── Data loading ────────────────────────────────────────────────── */

const cache = new Map();

async function loadSection(section, locale) {
  const key = `${section}_${locale}`;
  if (cache.has(key)) return cache.get(key);
  const res = await fetch(`json/sections/section_${section}_${locale}.json`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  cache.set(key, data);
  return data;
}

function findExhibit(exhibits, id) {
  return exhibits.find(e => String(e.id) === String(id)) || null;
}

/* ── Image helpers ───────────────────────────────────────────────── */

function toArray(val) {
  return val ? (Array.isArray(val) ? val : [val]).filter(Boolean) : [];
}

function thumbnail(images) {
  return images.find(s => s.includes('_ico.')) || images[0] || '';
}

function displayImages(images) {
  return images.filter(s => !s.includes('_ico.'));
}

/* ── Error UI ────────────────────────────────────────────────────── */

function renderError(container, retryFn) {
  const t = T[getLocale()];
  container.innerHTML = `
    <div class="error-boundary" role="alert">
      <div class="error-boundary__icon">⚠️</div>
      <div class="error-boundary__title">${t.loadError}</div>
      <div class="error-boundary__body">${t.loadErrorDetail}</div>
      <button class="error-boundary__retry">${t.retry}</button>
    </div>`;
  container.querySelector('.error-boundary__retry').addEventListener('click', retryFn);
}

/* ── Lightbox ────────────────────────────────────────────────────── */

const lightbox = {
  el: null, imgEl: null, images: [], idx: 0, _prevFocus: null,

  init() {
    this.el    = document.getElementById('js-lightbox');
    this.imgEl = this.el.querySelector('.lightbox__img');

    this.el.querySelector('.lightbox__overlay').addEventListener('click', () => this.close());
    this.el.querySelector('.lightbox__close').addEventListener('click',   () => this.close());
    this.el.querySelector('.lightbox__btn--prev').addEventListener('click', () => this.go(this.idx - 1));
    this.el.querySelector('.lightbox__btn--next').addEventListener('click', () => this.go(this.idx + 1));

    document.addEventListener('keydown', e => {
      if (!this.isOpen()) return;
      if (e.key === 'Escape')     this.close();
      if (e.key === 'ArrowLeft')  this.go(this.idx - 1);
      if (e.key === 'ArrowRight') this.go(this.idx + 1);
    });
  },

  open(images, startIdx = 0) {
    this.images = images;
    this.idx    = startIdx;
    this._prevFocus = document.activeElement;
    this.el.toggleAttribute('data-single', images.length === 1);
    this._render();
    this.el.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
    this.el.querySelector('.lightbox__close').focus();
  },

  close() {
    this.el.setAttribute('hidden', '');
    document.body.style.overflow = '';
    if (this._prevFocus) this._prevFocus.focus();
  },

  go(n) {
    this.idx = ((n % this.images.length) + this.images.length) % this.images.length;
    this._render();
  },

  isOpen() { return !this.el.hasAttribute('hidden'); },

  _render() {
    this.imgEl.src = this.images[this.idx];
    this.imgEl.alt = T[getLocale()].altPhoto;
  },
};

/* ── Carousel ────────────────────────────────────────────────────── */

function buildCarousel(images, altText) {
  const t = T[getLocale()];
  const slides = images.map((src, i) => `
    <div class="carousel__slide">
      <img src="${src}" alt="${altText}" loading="lazy"
           class="carousel__img--clickable"
           data-lightbox-idx="${i}"
           style="cursor:zoom-in"
           title="${t.openFullscreen}">
    </div>`).join('');

  const dots = images.map((_, i) =>
    `<span class="carousel__dot${i === 0 ? ' carousel__dot--active' : ''}"></span>`
  ).join('');

  return `
    <div class="carousel">
      <div class="carousel__track" tabindex="0">${slides}</div>
      <button class="carousel__btn carousel__btn--prev" aria-label="Previous">&#10094;</button>
      <button class="carousel__btn carousel__btn--next" aria-label="Next">&#10095;</button>
      <div class="carousel__dots">${dots}</div>
    </div>`;
}

function initCarousel(images) {
  const track = document.querySelector('.carousel__track');
  if (!track) return;

  const dots = Array.from(document.querySelectorAll('.carousel__dot'));
  let idx = 0;

  function goTo(n) {
    idx = ((n % track.children.length) + track.children.length) % track.children.length;
    track.style.transform = `translateX(-${idx * 100}%)`;
    dots.forEach((d, i) => d.classList.toggle('carousel__dot--active', i === idx));
  }

  document.querySelector('.carousel__btn--prev')?.addEventListener('click', () => goTo(idx - 1));
  document.querySelector('.carousel__btn--next')?.addEventListener('click', () => goTo(idx + 1));

  document.querySelector('.carousel__dots')?.addEventListener('click', e => {
    const dot = e.target.closest('.carousel__dot');
    if (dot) goTo(dots.indexOf(dot));
  });

  track.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft')  goTo(idx - 1);
    if (e.key === 'ArrowRight') goTo(idx + 1);
  });

  track.querySelectorAll('.carousel__img--clickable').forEach(img => {
    img.addEventListener('click', () => lightbox.open(images, Number(img.dataset.lightboxIdx)));
  });

  goTo(0);
}

/* ── Navigation ──────────────────────────────────────────────────── */

function renderNav({ backHref, backLabel } = {}) {
  const locale = getLocale();
  const nav = document.getElementById('js-nav');
  if (!nav) return;

  const backHTML = backHref
    ? `<div class="nav__back"><a href="${backHref}" class="nav__back-btn">${backLabel}</a></div>`
    : '<div class="nav__back"></div>';

  nav.innerHTML = `
    ${backHTML}
    <div class="nav__lang-switch">
      <button class="nav__lang-btn${locale === 'be' ? ' nav__lang-btn--active' : ''}" data-lang="be">Беларуская</button>
      <button class="nav__lang-btn${locale === 'en' ? ' nav__lang-btn--active' : ''}" data-lang="en">English</button>
    </div>`;

  nav.querySelectorAll('[data-lang]').forEach(btn => {
    btn.addEventListener('click', () => {
      setLocale(btn.dataset.lang);
      cache.clear();
      router();
    });
  });
}

function getRoot() { return document.getElementById('js-root'); }

/* ── Pages ───────────────────────────────────────────────────────── */

function renderHome() {
  const t = T[getLocale()];
  renderNav();
  document.title = t.siteTitle;
  getRoot().innerHTML = `
    <main class="welcome">
      <h1 class="welcome__title">${t.siteTitle}</h1>
      <p class="welcome__subtitle">${t.siteSubtitle}</p>
      <a href="#index" class="welcome__btn">${t.start}</a>
    </main>`;
}

const SECTION_ICONS = [
  [0, 'img/79.webp'],
  [1, 'img/5.webp'],
  [2, 'img/14.webp'],
  [3, 'img/21.webp'],
  [4, 'img/33.webp'],
  [5, 'img/75.webp'],
];

function renderSectionIndex() {
  const locale = getLocale();
  const t = T[locale];
  renderNav({ backHref: '#home', backLabel: t.backToHome });
  document.title = t.siteTitle;

  const list = SECTION_ICONS.map(([sec, img]) => {
    const isPreface = sec === 0;
    const href      = isPreface ? '#exhibit/0/0' : `#section/${sec}`;
    const labelHTML = isPreface ? '' : `<p class="exhibit-card__label">${t.section} ${sec}</p>`;
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

  getRoot().innerHTML = `
    <div class="page">
      <h2 class="page-title">${t.siteTitle}</h2>
      <ul>${list}</ul>
    </div>`;
}

async function renderSection(section) {
  const locale = getLocale();
  const t = T[locale];
  renderNav({ backHref: '#index', backLabel: t.backToSections });
  document.title = `${t.section} ${section}`;

  const root = getRoot();
  root.innerHTML = `<div class="page"><h2 class="page-title">${t.section} ${section}</h2><ul></ul></div>`;
  const listEl = root.querySelector('ul');

  const doLoad = async () => {
    try {
      const exhibits = await loadSection(section, locale);

      if (!exhibits.length) {
        listEl.innerHTML = `<p class="notice">${t.emptySection}</p>`;
        return;
      }

      listEl.innerHTML = exhibits.map(e => {
        const isIntro = typeof e.id === 'string' && e.id.startsWith('intro_');
        const label   = isIntro ? t.preface : `${t.exhibit} ${e.id}`;
        const imgs    = toArray(e.img);
        const thumb   = thumbnail(imgs);
        const thumbHTML = thumb
          ? `<img src="${thumb}" alt="${t.altThumb}" class="exhibit-card__thumbnail" loading="lazy">`
          : '';

        return `
          <li>
            <a href="#exhibit/${e.section}/${e.id}" class="exhibit-card">
              <div class="exhibit-card__thumb">${thumbHTML}</div>
              <div class="exhibit-card__info">
                <p class="exhibit-card__label">${label}</p>
                <h3 class="exhibit-card__title">${e[locale].title}</h3>
              </div>
            </a>
          </li>`;
      }).join('');

    } catch (err) {
      console.error('[section]', err);
      renderError(listEl, doLoad);
    }
  };

  await doLoad();
}

async function renderExhibit(section, id) {
  const locale    = getLocale();
  const t         = T[locale];
  const isPreface = section === '0' && id === '0';

  renderNav({
    backHref:  isPreface ? '#index' : `#section/${section}`,
    backLabel: isPreface ? t.backToSections : t.backToSection,
  });

  const root = getRoot();
  root.innerHTML = '<div class="page"></div>';
  const contentEl = root.querySelector('.page');

  const doLoad = async () => {
    try {
      const exhibits = await loadSection(section, locale);
      const exhibit  = findExhibit(exhibits, id);

      if (!exhibit) {
        contentEl.innerHTML = `<p class="notice notice--error">${t.notFound}</p>`;
        return;
      }

      const loc  = exhibit[locale];
      document.title = loc.title;

      const imgs    = displayImages(toArray(exhibit.img));
      const imgHTML = imgs.length === 0
        ? ''
        : imgs.length === 1
          ? `<img src="${imgs[0]}" alt="${t.altPhoto}" class="exhibit__image"
                  loading="lazy" style="cursor:zoom-in"
                  title="${t.openFullscreen}"
                  data-lightbox-single>`
          : buildCarousel(imgs, t.altPhoto);

      const infoHTML  = loc.info  ? `<p class="exhibit__meta">${loc.info}</p>` : '';
      const audioHTML = exhibit.audio
        ? `<audio src="${exhibit.audio}" class="exhibit__audio" controls></audio>`
        : '';

      contentEl.innerHTML = `
        <h3 class="exhibit__title">${loc.title}</h3>
        ${infoHTML}
        ${imgHTML}
        ${audioHTML}
        <div class="exhibit__body">${loc.text}</div>`;

      const singleImg = contentEl.querySelector('[data-lightbox-single]');
      if (singleImg) singleImg.addEventListener('click', () => lightbox.open(imgs, 0));

      if (imgs.length > 1) initCarousel(imgs);

    } catch (err) {
      console.error('[exhibit]', err);
      renderError(contentEl, doLoad);
    }
  };

  await doLoad();
}

/* ── Router ──────────────────────────────────────────────────────── */

function router() {
  const hash  = location.hash.slice(1) || 'home';
  const parts = hash.split('/');

  switch (parts[0]) {
    case 'home':    renderHome();                                    break;
    case 'index':   renderSectionIndex();                            break;
    case 'section': renderSection(parts[1] || '1');                  break;
    case 'exhibit': renderExhibit(parts[1] || '0', parts[2] || '0'); break;
    default:        renderHome();
  }
}

/* ── Init ────────────────────────────────────────────────────────── */

window.addEventListener('hashchange', router);
document.addEventListener('DOMContentLoaded', () => {
  lightbox.init();
  router();
});
