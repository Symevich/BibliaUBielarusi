/**
 * welcomeView.js — Welcome / splash page
 *
 * Route: welcome.html  (standalone entry point, before the SPA)
 *
 * Renders a full-screen welcome screen with the site title, subtitle,
 * and a "Start" button that navigates the user to index.html.
 * Language switcher in the header works the same way as in the SPA.
 */

'use strict';

import { getLang, setLang, T, LOCALES } from '../store.js';

const THEME_KEY = 'theme';


// ─── Theme ─────────────────────────────────────────────────────────

function _applyTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'light';
  document.documentElement.dataset.theme = saved;
  _syncThemeBtn(saved);
}

function _toggleTheme() {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem(THEME_KEY, next);
  _syncThemeBtn(next);
}

function _syncThemeBtn(theme) {
  const btn = document.getElementById('js-theme-btn');
  if (!btn) return;
  const t = T[getLang()];
  if (theme === 'dark') {
    btn.textContent = '☀️';
    btn.setAttribute('aria-label', t.themeLight || 'Light theme');
    btn.title       = t.themeLight || 'Light theme';
  } else {
    btn.textContent = '🌙';
    btn.setAttribute('aria-label', t.themeDark || 'Dark theme');
    btn.title       = t.themeDark || 'Dark theme';
  }
}

// ─── Public ────────────────────────────────────────────────────────

export function renderWelcome() {
  const lang = getLang();
  const t    = T[lang];

  document.title                = t.siteTitle;
  document.documentElement.lang = lang;

  _applyTheme();
  _paint(t);
  _syncLangUI();
  _initLangSwitcher();
  document.getElementById('js-theme-btn')
    ?.addEventListener('click', _toggleTheme);
}

// ─── Private ───────────────────────────────────────────────────────

function _paint(t) {
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
    <div class="view view--welcome">
      <section class="hero hero--welcome">
        <h1 class="hero__title">${t.siteTitle}</h1>
        <p class="hero__subtitle">${t.siteSubtitle}</p>
        <a class="btn btn--primary welcome__btn" href="index.html">
          ${t.welcomeButton}
        </a>
      </section>
    </div>`;
}

/** Reflect the active locale in the header language buttons. */
function _syncLangUI() {
  const lang = getLang();
  document.querySelectorAll('.lang-btn').forEach(btn => {
    const active = btn.dataset.lang === lang;
    btn.setAttribute('aria-pressed', String(active));
    btn.classList.toggle('is-active', active);
  });
  document.documentElement.lang = lang;
}

/** Wire the language buttons so switching re-renders in the new locale. */
function _initLangSwitcher() {
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const next = btn.dataset.lang;
      if (!LOCALES.includes(next) || next === getLang()) return;
      setLang(next);
      _syncLangUI();
      renderWelcome();
    });
  });
}
