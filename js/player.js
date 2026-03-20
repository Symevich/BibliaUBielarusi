/**
 * player.js — Persistent global audio controller
 *
 * Owns the single <audio id="audio-el"> element in the <footer>.
 * That element lives outside #app so SPA navigation never destroys it.
 *
 * Icon state is managed with CSS class .is-playing on the play button.
 * CSS in style.css controls which SVG icon path is visible.
 *
 * Improvements over previous version:
 *   • play/pause aria-labels read from T[getLang()] instead of being
 *     hardcoded in Belarusian — labels now update when the user switches
 *     language while audio is playing.
 *   • 'use strict' removed (ES modules are always strict mode).
 *
 * Public API (named exports):
 *   load(src, title)  — load + autoplay; resumes if same src buffered
 *   toggle()          — play / pause current track
 *   stop()            — pause + rewind to 0
 *   isPlaying()       — boolean
 *   currentSrc()      — normalised pathname of loaded src, or ''
 */

import { getLang, T } from './store.js';

// ─── DOM refs ─────────────────────────────────────────────────────
// Grabbed after module evaluation (type=module scripts are deferred,
// so the DOM is ready by the time this runs).
const audioEl   = document.getElementById('audio-el');
const playerBar = document.getElementById('audio-player');
const titleEl   = document.getElementById('audio-title');
const playBtn   = document.getElementById('ap-play');
const curEl     = document.getElementById('ap-current');
const durEl     = document.getElementById('ap-duration');
const seekEl    = document.getElementById('ap-seek');
const muteBtn   = document.getElementById('ap-mute');
const volumeEl  = document.getElementById('ap-volume');

// ─── Private helpers ───────────────────────────────────────────────

/** Seconds → "m:ss" */
function fmt(s) {
  if (!isFinite(s) || s < 0) return '0:00';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

/**
 * Normalise a src for same-file comparison.
 * The browser makes audioEl.src absolute; we strip the origin.
 */
function normSrc(raw) {
  if (!raw) return '';
  try { return new URL(raw).pathname; } catch { return raw; }
}

/**
 * Toggle .is-playing CSS class on the play button and update its
 * aria-label in the currently active locale.
 */
function setPlayingState(playing) {
  if (!playBtn) return;
  const t = T[getLang()];
  playBtn.classList.toggle('is-playing', playing);
  playBtn.setAttribute('aria-label', playing ? t.pauseAudio : t.playAudio);
}

/** Reset seek thumb and time labels to zero (on new track load). */
function resetSeekUI() {
  if (seekEl) { seekEl.value = '0'; seekEl.max = '100'; }
  if (curEl)  curEl.textContent = '0:00';
  if (durEl)  durEl.textContent = '0:00';
}

// ─── Audio element event listeners ────────────────────────────────

if (audioEl) {
  audioEl.addEventListener('play', () => {
    setPlayingState(true);
    if (playerBar) playerBar.hidden = false; // reveal footer bar on first play
  });

  audioEl.addEventListener('pause', () => setPlayingState(false));

  audioEl.addEventListener('ended', () => {
    setPlayingState(false);
    if (seekEl) seekEl.value = '0';
    if (curEl)  curEl.textContent = '0:00';
  });

  audioEl.addEventListener('loadedmetadata', () => {
    if (!isFinite(audioEl.duration)) return;
    if (durEl)  durEl.textContent = fmt(audioEl.duration);
    if (seekEl) seekEl.max = String(audioEl.duration);
  });

  // rAF-throttled timeupdate — prevents layout thrashing at 60 fps
  let _raf = 0;
  audioEl.addEventListener('timeupdate', () => {
    if (_raf) return;
    _raf = requestAnimationFrame(() => {
      _raf = 0;
      if (curEl) curEl.textContent = fmt(audioEl.currentTime);
      // Only sync the seek thumb when the user is NOT dragging it
      if (seekEl && !seekEl.matches(':active')) {
        seekEl.value = String(audioEl.currentTime);
      }
    });
  });

  audioEl.addEventListener('error', () => {
    console.error('[player] audio error', audioEl.error?.code, audioEl.error?.message);
    setPlayingState(false);
  });
}

// ─── Control UI event listeners ────────────────────────────────────

playBtn?.addEventListener('click', () => {
  if (!audioEl) return;
  audioEl.paused ? audioEl.play().catch(console.warn) : audioEl.pause();
});

seekEl?.addEventListener('input', () => {
  if (audioEl) audioEl.currentTime = Number(seekEl.value);
});

muteBtn?.addEventListener('click', () => {
  if (!audioEl) return;
  audioEl.muted = !audioEl.muted;
  muteBtn.classList.toggle('is-muted', audioEl.muted);
  // Use localised label — T keys exist in all locales
  const t = T[getLang()];
  muteBtn.setAttribute(
    'aria-label',
    audioEl.muted
      ? (t.unmuteAudio ?? 'Unmute')
      : (t.muteAudio  ?? 'Mute')
  );
});

volumeEl?.addEventListener('input', () => {
  if (!audioEl) return;
  audioEl.volume = Number(volumeEl.value);
  if (audioEl.muted && audioEl.volume > 0) {
    audioEl.muted = false;
    muteBtn?.classList.remove('is-muted');
  }
});

// ─── Public API ────────────────────────────────────────────────────

/**
 * Load and autoplay a track.
 * If the same src is already buffered (readyState >= 2), resume
 * from the current position instead of reloading the network resource.
 *
 * @param {string} src    Relative path, e.g. "assets/audio/track-5.mp3"
 * @param {string} [title] Shown in the footer player bar.
 */
export function load(src, title = '') {
  if (!audioEl || !src) return;

  const incoming = normSrc(src);
  const loaded   = normSrc(audioEl.src);

  if (incoming && loaded.endsWith(incoming) && audioEl.readyState >= 2) {
    audioEl.play().catch(console.warn);
  } else {
    resetSeekUI();
    audioEl.src = src;
    audioEl.load();
    audioEl.play().catch(console.warn);
  }

  if (titleEl) titleEl.textContent = title || '—';
}

/** Play if paused, pause if playing. Does not change the src. */
export function toggle() {
  if (!audioEl) return;
  audioEl.paused ? audioEl.play().catch(console.warn) : audioEl.pause();
}

/** Pause and rewind to the start. */
export function stop() {
  if (!audioEl) return;
  audioEl.pause();
  audioEl.currentTime = 0;
}

/** @returns {boolean} */
export function isPlaying() {
  return !!audioEl && !audioEl.paused;
}

/**
 * Normalised pathname of the currently loaded src.
 * Returns '' when nothing is loaded.
 * @returns {string}
 */
export function currentSrc() {
  return normSrc(audioEl?.src ?? '');
}
