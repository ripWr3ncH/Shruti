/**
 * Inline SVG icon set.
 *
 * Deliberately hand-drawn as SVG rather than an icon font or emoji: it keeps the
 * bundle self-contained, lets every glyph inherit `currentColor`, and avoids the
 * accessibility pitfalls of font-based icons. Icons are always decorative here —
 * every control that uses one also carries a real text label — so each renders
 * `aria-hidden` and is skipped by assistive technology.
 */

// Glyphs that read better as solid shapes than as outlines.
const FILLED = new Set(['play', 'sparkle', 'heart']);

const PATHS = {
  play: <path d="M8 5.14v13.72a1 1 0 0 0 1.53.85l10.9-6.86a1 1 0 0 0 0-1.7L9.53 4.3A1 1 0 0 0 8 5.14Z" />,
  pause: (
    <>
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </>
  ),
  back: (
    <>
      <path d="M11 19 3 12l8-7z" fill="currentColor" stroke="none" />
      <path d="M21 19l-8-7 8-7z" fill="currentColor" stroke="none" />
    </>
  ),
  forward: (
    <>
      <path d="M13 5l8 7-8 7z" fill="currentColor" stroke="none" />
      <path d="M3 5l8 7-8 7z" fill="currentColor" stroke="none" />
    </>
  ),
  sound: (
    <>
      <path d="M4 9.5v5h3.5L13 19V5L7.5 9.5H4Z" />
      <path d="M16.5 8.5a4.5 4.5 0 0 1 0 7" />
      <path d="M19.5 5.5a8.5 8.5 0 0 1 0 13" />
    </>
  ),
  mute: (
    <>
      <path d="M4 9.5v5h3.5L13 19V5L7.5 9.5H4Z" />
      <path d="M22 9.5l-5 5M17 9.5l5 5" />
    </>
  ),
  descriptions: <path d="M4 10.5v3M8 7.5v9M12 4.5v15M16 8.5v7M20 11v2" />,
  skip: (
    <>
      <path d="M5 5l8.5 7L5 19z" fill="currentColor" stroke="none" />
      <path d="M18 5v14" />
    </>
  ),
  replay: (
    <>
      <path d="M4 12a8 8 0 1 0 2.6-5.9" />
      <path d="M3 3.5V8h4.5" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.6-6.8 10-6.8S22 12 22 12s-3.6 6.8-10 6.8S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  code: <path d="M8.5 8 4 12l4.5 4M15.5 8 20 12l-4.5 4M13.5 6l-3 12" />,
  terminal: (
    <>
      <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
      <path d="M7 9.5l2.6 2.5L7 14.5M12.5 15h4.5" />
    </>
  ),
  diagram: (
    <>
      <rect x="3.5" y="5" width="7" height="5" rx="1.2" />
      <rect x="13.5" y="14" width="7" height="5" rx="1.2" />
      <path d="M10.5 7.5h4.5a2 2 0 0 1 2 2v4.5" />
    </>
  ),
  chart: <path d="M4 20V4M4 20h16M8.5 20v-6M13 20v-9.5M17.5 20v-4.5" />,
  sigma: <path d="M17.5 5.5H6.5l6 6.5-6 6.5h11" />,
  cursor: <path d="M5 4l6.2 15.2 2.3-6.4 6.5-2.4z" />,
  sparkle: (
    <path d="M12 3l1.9 5.6a2 2 0 0 0 1.3 1.3L20.8 12l-5.6 1.9a2 2 0 0 0-1.3 1.3L12 20.8l-1.9-5.6a2 2 0 0 0-1.3-1.3L3.2 12l5.6-1.9a2 2 0 0 0 1.3-1.3z" />
  ),
  check: <path d="M4.5 12.5l4.5 4.5L19.5 6.5" />,
  alert: (
    <>
      <path d="M12 3.5 22 20.5H2z" />
      <path d="M12 9.5v4.5" />
      <circle cx="12" cy="17.5" r="0.6" fill="currentColor" stroke="none" />
    </>
  ),
  external: <path d="M14 4h6v6M20 4l-8.5 8.5M18 13.5V19a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5.5" />,
  chevron: <path d="M6 9.5l6 6 6-6" />,
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.3 9.2a2.8 2.8 0 0 1 3.9-2.3c1.9 1 1.5 3.4-.5 4.1-.9.3-1.4 1-1.4 2" />
      <circle cx="12" cy="16.8" r="0.6" fill="currentColor" stroke="none" />
    </>
  ),
  heart: <path d="M12 20.3S3.5 15.5 3.5 9.2C3.5 6.4 5.6 4.5 8 4.5c1.8 0 3.1 1 4 2.3.9-1.3 2.2-2.3 4-2.3 2.4 0 4.5 1.9 4.5 4.7 0 6.3-8.5 11.1-8.5 11.1z" />,
  keyboard: (
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="2.5" />
      <path d="M7 10h.01M11 10h.01M15 10h.01M17 10h.01M9 13h.01M13 13h.01M8 15.5h8" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6 6 18" />,
  home: (
    <>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9a1 1 0 0 0 1 1h3v-6h4v6h3a1 1 0 0 0 1-1v-9" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.8-3.8" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3M8.5 21h7" />
    </>
  ),
  stop: <rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor" stroke="none" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3.1" />
      <path d="M19.4 13a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-1-1.4 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.6 1.6 0 0 0 1.4-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 1 1.4 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.4 1z" />
    </>
  ),
  language: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.6 3.8 5.8 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.8-3.8-9S9.5 5.6 12 3Z" />
    </>
  ),
};

export function Icon({ name, size = 20, className, strokeWidth = 1.9 }) {
  const glyph = PATHS[name];
  if (!glyph) return null;
  const filled = FILLED.has(name);
  return (
    <svg
      className={className ? `icon ${className}` : 'icon'}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {glyph}
    </svg>
  );
}

export default Icon;
