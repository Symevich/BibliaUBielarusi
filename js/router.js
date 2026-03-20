/**
 * router.js — Query-parameter SPA router
 *
 * URL scheme:
 *   index.html                   → homeView   (section grid)
 *   index.html?section=3         → sectionView (object list)
 *   index.html?section=3&id=21   → objectView  (exhibit detail)
 *
 * Improvements over previous version:
 *   • Stale-render guard: _routeId is incremented on every navigation.
 *     Views receive the id and bail out after each await if a newer
 *     navigation has already started. Prevents concurrent async renders
 *     from writing to #app out of order.
 *   • Focus management: #app is focused after every route change so
 *     keyboard and screen-reader users land at the new content without
 *     having to tab back up from wherever focus was left.
 *   • getCurrentRouteId / isCurrentRoute exported for use in views.
 */

// Monotonically increasing counter. Every call to route() claims the
// next id. An in-flight render compares its captured id against the
// current value; if they differ it discards its result silently.
let _routeId = 0;

/** @returns {number} */
export function getCurrentRouteId() { return _routeId; }

/**
 * Returns true when the supplied id still matches the most recent
 * navigation. Views call this after every await to detect cancellation.
 * @param {number} id
 * @returns {boolean}
 */
export function isCurrentRoute(id) { return _routeId === id; }

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
 * Read the current URL, claim a route id, then render the correct view.
 * Called on initial load, every navigate(), and every popstate.
 */
export async function route() {
  const myId = ++_routeId;
  const { section, id } = getParams();

  window.scrollTo({ top: 0, behavior: 'instant' });

  if (section !== null && id !== null) {
    const { renderObject } = await import('./views/objectView.js');
    if (!isCurrentRoute(myId)) return;
    renderObject(section, id, myId);

  } else if (section !== null) {
    const { renderSection } = await import('./views/sectionView.js');
    if (!isCurrentRoute(myId)) return;
    renderSection(section, myId);

  } else {
    const { renderHome } = await import('./views/homeView.js');
    if (!isCurrentRoute(myId)) return;
    renderHome(myId);
  }

  // Move keyboard focus into #app so AT users land at new content.
  // requestAnimationFrame defers until the view has written its HTML.
  requestAnimationFrame(() => {
    const app = document.getElementById('app');
    if (app) app.focus();
  });
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
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    // Only intercept relative, same-origin links
    if (!href
      || href.startsWith('http')
      || href.startsWith('//')
      || href.startsWith('#')) return;
    e.preventDefault();
    navigate(href);
  });

  route();
}
