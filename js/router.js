/**
 * router.js — Query-parameter SPA router
 *
 * URL scheme:
 *   index.html                     → homeView   (section grid)
 *   index.html?section=3           → sectionView (object list)
 *   index.html?section=3&id=21     → objectView  (exhibit detail)
 *
 * All navigation goes through navigate(url), which calls
 * history.pushState then route(). The browser back/forward buttons
 * fire 'popstate', which also calls route().
 *
 * Views are loaded with dynamic import() so only the code for the
 * current route is evaluated. This also prevents the circular
 * dependency that would arise from top-level static imports
 * (views import app.js; app.js imports router.js).
 */

'use strict';

// ─── Read current URL params ───────────────────────────────────────

/**
 * @returns {{ section: string|null, id: string|null }}
 */
export function getParams() {
  const sp = new URLSearchParams(window.location.search);
  return {
    section: sp.get('section'),
    id:      sp.get('id'),
  };
}

// ─── Navigate ─────────────────────────────────────────────────────

/**
 * Push a new history entry and render the corresponding view.
 * @param {string} url  e.g. "index.html?section=3&id=21"
 */
export function navigate(url) {
  history.pushState(null, '', url || 'index.html');
  route();
}

// ─── Route dispatcher ─────────────────────────────────────────────

/**
 * Read the current URL and render the correct view into #app.
 * Called on initial load, every navigate(), and every popstate.
 */
export async function route() {
  const { section, id } = getParams();

  // Scroll to top on every navigation
  window.scrollTo({ top: 0, behavior: 'instant' });

    
  if (section !== null && id !== null) {
    const { renderObject } = await import('./views/objectView.js');
    renderObject(section, id);

  } else if (section !== null) {
    const { renderSection } = await import('./views/sectionView.js');
    renderSection(section);

  } else {
    const { renderHome } = await import('./views/homeView.js');
    renderHome();

  }
}

// ─── Init ──────────────────────────────────────────────────────────

/**
 * Attach listeners and dispatch the initial route.
 * Called once from app.js on DOMContentLoaded.
 */
export function initRouter() {
  // Browser back / forward
  window.addEventListener('popstate', route);

  // Global click interceptor — catches every internal <a href> so
  // no anchor ever causes a full page reload.
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    // Only intercept relative, same-origin links
    if (!href || href.startsWith('http') || href.startsWith('//') || href.startsWith('#')) return;
    e.preventDefault();
    navigate(href);
  });

  route();
}
