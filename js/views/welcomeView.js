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

// One-time wiring guards — prevents duplicate listeners when
// renderWelcome() is called again on every language switch.
let _langWired   = false;
let _themeWired  = false;

// ─── Public ────────────────────────────────────────────────────────

export function renderWelcome() {
  const lang = getLang();
  const t    = T[lang];

  document.title                = t.siteTitle;
  document.documentElement.lang = lang;

  applyTheme();       // restore persisted theme immediately (no flash)
  _paint(t);
  _syncLangUI();
  _initLangSwitcher();   // no-op after first call
  _initThemeBtn();       // no-op after first call
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

/** Wire language buttons once — re-calling after the first time is a no-op. */
function _initLangSwitcher() {
  if (_langWired) return;
  _langWired = true;
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

/** Wire the theme toggle once — re-calling after the first time is a no-op. */
function _initThemeBtn() {
  if (_themeWired) return;
  _themeWired = true;
  document.getElementById('js-theme-btn')
    ?.addEventListener('click', toggleTheme);
}
