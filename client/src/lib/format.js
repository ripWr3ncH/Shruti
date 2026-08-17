/**
 * Formatting helpers that do not depend on the interface language.
 *
 * The spoken form of a duration lives in `i18n/index.jsx` as `spokenTime`,
 * because it needs the dictionary to name its units.
 */

/** `93` -> `1:33` */
export function formatTime(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return hours ? `${hours}:${pad(minutes)}:${pad(secs)}` : `${minutes}:${pad(secs)}`;
}

/** Rough spoken duration of a phrase, used to fit descriptions into a gap. */
export function estimateSpeechSeconds(text, rate = 1) {
  const words = String(text || '').split(/\s+/).filter(Boolean).length;
  return (words / 2.8) / Math.max(0.5, rate);
}
