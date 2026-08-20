/**
 * Where the learner had got to in each video.
 *
 * Front-loaded processing means a video is usually watched over more than one
 * sitting, and losing your place in a fifty minute lecture is worse for someone
 * who cannot scrub a timeline by eye — finding a spot again costs them a lot
 * more than it costs a sighted viewer. So the position is remembered per video
 * and offered back on the next visit.
 *
 * Deliberately local-only: this is a viewing habit, not something to send to a
 * server that has no accounts and no authentication.
 */

const STORAGE_KEY = 'shruti.progress.v1';

/** Below this, there is nothing worth resuming. */
export const MIN_RESUME_SECONDS = 20;
/** This close to the end, the learner has effectively finished. */
const END_MARGIN_SECONDS = 30;
/** Keep the store small — oldest entries fall off first. */
const MAX_ENTRIES = 60;

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(entries) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* storage unavailable — the position simply is not remembered */
  }
}

/**
 * The saved position for a video, or `null` when there is nothing useful to
 * offer: no entry, too near the start, or too near the end to be worth it.
 *
 * @param {string} videoId
 * @param {number} [duration] total length, when it is already known
 * @returns {number|null} seconds
 */
export function loadProgress(videoId, duration = 0) {
  if (!videoId) return null;
  const entry = readAll()[videoId];
  const seconds = Number(entry?.time);
  if (!Number.isFinite(seconds) || seconds < MIN_RESUME_SECONDS) return null;
  if (duration > 0 && seconds > duration - END_MARGIN_SECONDS) return null;
  return seconds;
}

/**
 * Remember a position. Called on a timer while playing, so it is cheap and
 * tolerant: a position at either end of the video clears the entry instead of
 * storing a place nobody wants to return to.
 */
export function saveProgress(videoId, seconds, duration = 0) {
  if (!videoId || !Number.isFinite(seconds)) return;
  const entries = readAll();

  const tooEarly = seconds < MIN_RESUME_SECONDS;
  const tooLate = duration > 0 && seconds > duration - END_MARGIN_SECONDS;
  if (tooEarly || tooLate) {
    delete entries[videoId];
    writeAll(entries);
    return;
  }

  entries[videoId] = { time: Math.floor(seconds), duration: Math.floor(duration), at: Date.now() };

  const keys = Object.keys(entries);
  if (keys.length > MAX_ENTRIES) {
    keys
      .sort((a, b) => (entries[a].at || 0) - (entries[b].at || 0))
      .slice(0, keys.length - MAX_ENTRIES)
      .forEach((key) => delete entries[key]);
  }

  writeAll(entries);
}

/** Forget a video's position — used when the learner jumps back to the start. */
export function clearProgress(videoId) {
  if (!videoId) return;
  const entries = readAll();
  if (!(videoId in entries)) return;
  delete entries[videoId];
  writeAll(entries);
}
