import { useRef } from 'react';

/**
 * Persistent "load a different video" bar, shown once a video is loaded or
 * loading. Without this, switching videos meant navigating back to the
 * chooser screen (or reloading the page) — an unnecessary detour, especially
 * for a keyboard/screen-reader user who has to re-orient every time.
 */
export function HeaderUrlBar({ onSubmit, busy }) {
  const inputRef = useRef(null);

  const handleSubmit = (event) => {
    event.preventDefault();
    const value = inputRef.current?.value?.trim();
    if (!value) return;
    onSubmit(value);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <form className="header-url-form" onSubmit={handleSubmit} role="search" aria-label="Load a different video">
      <label htmlFor="header-youtube-url" className="sr-only">
        YouTube video link
      </label>
      <input
        id="header-youtube-url"
        ref={inputRef}
        type="url"
        inputMode="url"
        autoComplete="url"
        spellCheck="false"
        placeholder="Paste a YouTube link to load a new video"
        disabled={busy}
      />
      <button type="submit" className="secondary" disabled={busy}>
        {busy ? 'Loading…' : 'Load video'}
      </button>
    </form>
  );
}

export default HeaderUrlBar;
