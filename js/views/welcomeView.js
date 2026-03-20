/**
 * welcomeView.js — Welcome / splash page
 *
 * Route: welcome.html  (standalone entry point, before the SPA)
 *
 * Improvements over previous version:
 *   • Theme logic (applyTheme, toggleTheme, syncThemeBtn) imported from
 *     utils/theme.js instead of being duplicated here. The ~30 lines of
 *     identical code that previously lived in both welcomeView.js and
 *     app.js are now in a single shared module.
 *   • 'use strict' removed — redundant in ES modules.
 */

import { getLang, setLang, T, LOCALES }   from '../store.js';
import { applyTheme, toggleTheme }        from '../utils/theme.js';

// ─── Public ────────────────────────────────────────────────────────

export function renderWelcome() {
  const lang = getLang();
  const t    = T[lang];

  document.title                = t.siteTitle;
  document.documentElement.lang = lang;

  applyTheme();       // restore persisted theme immediately (no flash)
  _paint(t);
  _syncLangUI();
  _initLangSwitcher();
  document.getElementById('js-theme-btn')
    ?.addEventListener('click', toggleTheme);
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

/** Wire language buttons so switching re-renders the page in the new locale. */
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
