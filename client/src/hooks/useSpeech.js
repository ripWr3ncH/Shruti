/**
 * Speech synthesis.
 *
 * This is the primary output channel of the whole application, so it is built
 * defensively: one utterance at a time, always resolvable, never able to strand
 * the caller (a stranded `onEnd` would leave a video paused forever).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;

/** Bare language subtag, so "bn-IN" and "bn-BD" both match a "bn" target. */
const baseLang = (code) => String(code || '').trim().toLowerCase().split(/[-_]/)[0];

export function useSpeech({ rate = 1, pitch = 1, volume = 1, voiceURI = '', lang = 'en' } = {}) {
  const [voices, setVoices] = useState([]);
  const [speaking, setSpeaking] = useState(false);
  const currentRef = useRef(null);
  const settingsRef = useRef({ rate, pitch, volume, voiceURI, lang });

  settingsRef.current = { rate, pitch, volume, voiceURI, lang };

  useEffect(() => {
    if (!synth) return undefined;
    const load = () => setVoices(synth.getVoices() || []);
    load();
    synth.addEventListener?.('voiceschanged', load);
    return () => synth.removeEventListener?.('voiceschanged', load);
  }, []);

  // Chrome silently suspends synthesis after ~15 seconds of speech; a periodic
  // pause/resume keeps long answers (e.g. "read the code") from cutting off.
  useEffect(() => {
    if (!synth) return undefined;
    const timer = setInterval(() => {
      if (synth.speaking && !synth.paused) {
        synth.pause();
        synth.resume();
      }
    }, 10_000);
    return () => clearInterval(timer);
  }, []);

  const cancel = useCallback(() => {
    if (!synth) return;
    const pending = currentRef.current;
    currentRef.current = null;
    synth.cancel();
    setSpeaking(false);
    pending?.resolve?.({ cancelled: true });
  }, []);

  /**
   * Speaks `text`, resolving when it finishes (or is cancelled).
   * @returns {Promise<{cancelled:boolean, error?:string}>}
   */
  const speak = useCallback(
    (text, overrides = {}) =>
      new Promise((resolve) => {
        const content = String(text || '').trim();
        if (!synth || !content) {
          resolve({ cancelled: true });
          return;
        }

        // Replace whatever is being said: a newer description or answer is
        // always more relevant than the one it interrupts.
        if (synth.speaking || synth.pending) {
          const previous = currentRef.current;
          currentRef.current = null;
          synth.cancel();
          previous?.resolve?.({ cancelled: true });
        }

        const settings = { ...settingsRef.current, ...overrides };
        const utterance = new SpeechSynthesisUtterance(content);
        utterance.rate = settings.rate;
        utterance.pitch = settings.pitch;
        utterance.volume = settings.volume;

        // Choose a voice that actually speaks the description's language. The
        // saved voice preference is only honoured when it matches — otherwise an
        // English voice would read (say) Bengali text aloud as nonsense.
        const target = baseLang(settings.lang) || 'en';
        const available = synth.getVoices() || [];
        const chosen = available.find((v) => v.voiceURI === settings.voiceURI);
        const voice =
          chosen && baseLang(chosen.lang) === target
            ? chosen
            : available.find((v) => baseLang(v.lang) === target);
        if (voice) utterance.voice = voice;
        // Prefer the matched voice's exact tag; fall back to the target language
        // (never force en-US, which would mislabel non-English speech).
        utterance.lang = voice?.lang || (target === 'en' ? 'en-US' : settings.lang || target);

        const entry = { resolve, utterance };
        currentRef.current = entry;

        let settled = false;
        const finish = (result) => {
          if (settled) return;
          settled = true;
          clearTimeout(watchdog);
          if (currentRef.current === entry) {
            currentRef.current = null;
            setSpeaking(false);
          }
          resolve(result);
        };

        // Some browsers drop `end` entirely if the tab is backgrounded. Without
        // this the caller would wait forever with the video paused.
        const watchdog = setTimeout(
          () => finish({ cancelled: false, error: 'speech-timeout' }),
          Math.max(8000, (content.length / 8) * 1000 * (1 / Math.max(0.5, settings.rate))),
        );

        utterance.onend = () => finish({ cancelled: false });
        utterance.onerror = (event) =>
          finish({ cancelled: event.error === 'interrupted' || event.error === 'canceled', error: event.error });

        setSpeaking(true);
        synth.speak(utterance);
      }),
    [],
  );

  useEffect(() => cancel, [cancel]);

  const target = baseLang(lang) || 'en';
  const languageVoices = useMemo(
    () => voices.filter((voice) => baseLang(voice.lang) === target),
    [voices, target],
  );

  return {
    speak,
    cancel,
    speaking,
    // Voices for the active language, so the settings picker offers the right
    // ones. Falls back to every voice when the device has none for it.
    voices: languageVoices.length ? languageVoices : voices,
    /** Whether the device actually has a voice that speaks the active language. */
    voiceAvailable: languageVoices.length > 0,
    lang: target,
    supported: Boolean(synth),
  };
}

export default useSpeech;
