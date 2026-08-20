/** User preferences, persisted so a learner sets them up once. */
import { useCallback, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'shruti.settings.v1';

export const DEFAULT_SETTINGS = {
  /** Speech rate for descriptions and answers. */
  rate: 1.1,
  /**
   * Playback rate for the video itself. Separate from `rate` on purpose: a
   * learner who wants the instructor at 1.5x very often still wants the
   * descriptions read at a normal, unhurried speed.
   */
  videoRate: 1,
  volume: 1,
  voiceURI: '',
  /** Master switch for automatic audio descriptions. */
  descriptionsEnabled: true,
  /**
   * Speak status messages aloud as well as announcing them to a screen reader.
   * Off by default: with a screen reader running it would double-speak.
   */
  speakStatus: false,
  highContrast: false,
  /** Duck the video's own volume while Shruti is speaking. */
  duckVideo: true,
};

function read() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function useSettings() {
  const [settings, setSettings] = useState(read);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* storage unavailable — preferences simply do not persist */
    }
  }, [settings]);

  useEffect(() => {
    document.documentElement.dataset.contrast = settings.highContrast ? 'high' : 'normal';
  }, [settings.highContrast]);

  const update = useCallback((patch) => {
    setSettings((current) => ({ ...current, ...patch }));
  }, []);

  const toggle = useCallback((key) => {
    let next;
    setSettings((current) => {
      next = !current[key];
      return { ...current, [key]: next };
    });
    return next;
  }, []);

  const reset = useCallback(() => setSettings({ ...DEFAULT_SETTINGS }), []);

  return useMemo(() => ({ settings, update, toggle, reset }), [settings, update, toggle, reset]);
}

export default useSettings;
