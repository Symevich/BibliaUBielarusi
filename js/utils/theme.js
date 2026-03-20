/**
 * utils/theme.js — Shared light/dark theme utilities
 *
 * Previously, identical theme logic was duplicated between app.js
 * (SPA entry point) and welcomeView.js (splash page). This module
 * is the single source of truth for both pages.
 *
 * Exports:
 *   applyTheme()       — restore persisted theme on boot (no flash)
 *   toggleTheme()      — flip between light ↔ dark
 *   syncThemeBtn(theme)— update button icon + aria-label
 */

import { getLang, T } from '../store.js';

const THEME_KEY = 'theme';

/**
 * Apply the persisted theme (defaulting to 'light') to <html data-theme>.
 * Call once at the very start of boot, before any rendering, to avoid a
 * flash of the wrong theme.
 */
export function applyTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'light';
  document.documentElement.dataset.theme = saved;
  syncThemeBtn(saved);
}

/**
 * Toggle between light and dark, persisting the new choice.
 * Suitable as a direct click handler.
 */
export function toggleTheme() {
  const current = document.documentElement.dataset.theme;
  const next    = current === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem(THEME_KEY, next);
  syncThemeBtn(next);
}

/**
 * Update the theme toggle button icon and accessible label to reflect
 * the currently active theme. Safe to call when the button is absent.
 *
 * @param {string} theme  'light' | 'dark'
 */
export function syncThemeBtn(theme) {
  const btn = document.getElementById('js-theme-btn');
  if (!btn) return;
  const t = T[getLang()];
  if (theme === 'dark') {
    btn.textContent = '☀️';
    btn.setAttribute('aria-label', t.themeLight);
    btn.title = t.themeLight;
  } else {
    btn.textContent = '🌙';
    btn.setAttribute('aria-label', t.themeDark);
    btn.title = t.themeDark;
  }
}
