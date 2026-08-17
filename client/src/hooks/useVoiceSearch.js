/**
 * Voice + text search state, shared by the push-to-talk W key and the search
 * dialog.
 *
 * Push-to-talk: hold W to record, release to send. The clip is transcribed on
 * the server (Whisper — speech recognition, a supporting technology, never an
 * LLM) and the transcript is searched on YouTube. All the handlers are stable
 * (state lives in refs) so the global key listener is attached once and never
 * churns.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../lib/api.js';

const MAX_RECORD_MS = 10_000;
// The "Transcribing…" pill must stay up at least this long. A fast reply
// (short clip, warm cache) can come back in a few hundred ms, which reads as
// a glitch — the pill flashes and is gone before anyone can read it — rather
// than as a completed action.
const MIN_TRANSCRIBE_MS = 1100;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function useVoiceSearch({ announce, onResults } = {}) {
  const [voiceEnabled, setVoiceEnabled] = useState(null);
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState([]);
  const [transcript, setTranscript] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const startingRef = useRef(false);
  const listeningRef = useRef(false);
  const busyRef = useRef(false);
  const stopRequestedRef = useRef(false);
  const autoStopRef = useRef(null);

  // Latest props kept in refs so the stable callbacks always see current values.
  const announceRef = useRef(announce);
  announceRef.current = announce;
  const onResultsRef = useRef(onResults);
  onResultsRef.current = onResults;

  useEffect(() => {
    let alive = true;
    api
      .voiceSearchStatus()
      .then((data) => alive && setVoiceEnabled(Boolean(data.enabled)))
      .catch(() => alive && setVoiceEnabled(false));
    return () => {
      alive = false;
    };
  }, []);

  const setListen = (value) => {
    listeningRef.current = value;
    setListening(value);
  };
  const setBusyBoth = (value) => {
    busyRef.current = value;
    setBusy(value);
  };

  const say = (message, assertive = false) => announceRef.current?.(message, assertive ? { assertive: true } : undefined);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  // Runs when the recorder finishes: build the clip, transcribe, then search.
  const finish = useCallback(async () => {
    setListen(false);
    clearTimeout(autoStopRef.current);
    const recorder = recorderRef.current;
    const blob = new Blob(chunksRef.current, { type: recorder?.mimeType || 'audio/webm' });
    chunksRef.current = [];
    stopStream();

    if (!blob || blob.size < 1200) {
      const message = 'I could not hear anything. Press W, speak clearly, then press W again.';
      setError(message);
      setStatus('');
      say(message, true);
      return;
    }

    setBusyBoth(true);
    setStatus('Transcribing your search…');
    say('Transcribing your search.');
    const startedAt = Date.now();
    try {
      // Search phrases are English here, so pin Whisper to English — otherwise an
      // accented English phrase can be mis-detected as another language.
      const data = await api.voiceSearch(blob, { language: 'en' });
      const found = data.results || [];
      setTranscript(data.transcript || '');
      setResults(found);
      if (data.transcript) {
        setStatus(`Heard: “${data.transcript}” — ${found.length} result${found.length === 1 ? '' : 's'}.`);
        say(`Searching for ${data.transcript}. ${found.length} result${found.length === 1 ? '' : 's'} found.`);
      } else {
        const message = data.message || 'I could not hear a search. Please try again.';
        setStatus(message);
        say(message, true);
      }
      onResultsRef.current?.(found, data.transcript || '');
    } catch (err) {
      setError(err.message);
      setStatus('');
      say(err.message, true);
      onResultsRef.current?.([], '');
    } finally {
      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_TRANSCRIBE_MS) await wait(MIN_TRANSCRIBE_MS - elapsed);
      setBusyBoth(false);
    }
  }, []);

  const stopHold = useCallback(() => {
    clearTimeout(autoStopRef.current);
    // Released before the mic finished opening — stop as soon as it starts.
    if (startingRef.current) {
      stopRequestedRef.current = true;
      return;
    }
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }, []);

  const startHold = useCallback(async () => {
    if (listeningRef.current || startingRef.current || busyRef.current) return;
    setError('');
    setResults([]);
    setTranscript('');

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Voice input is not supported in this browser. Please type your search.');
      say('Voice input is not supported in this browser.', true);
      return;
    }

    startingRef.current = true;
    stopRequestedRef.current = false;
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      startingRef.current = false;
      setError('Microphone access was blocked. Allow the microphone, or type your search instead.');
      say('Microphone access was blocked.', true);
      return;
    }

    streamRef.current = stream;
    const recorder = new MediaRecorder(stream);
    recorderRef.current = recorder;
    chunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size) chunksRef.current.push(event.data);
    };
    recorder.onstop = finish;
    recorder.start();
    startingRef.current = false;
    setListen(true);
    setStatus('Listening… speak, then press W again to search.');
    say('Listening. Speak now, then press W again to search.', true);
    autoStopRef.current = setTimeout(() => {
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    }, MAX_RECORD_MS);

    // A stop was requested while the mic was still opening — honour it now.
    if (stopRequestedRef.current) stopHold();
  }, [finish, stopHold]);

  // Press-to-toggle: one press starts recording, the next sends it to search.
  // This is what the W key uses (tapping W to record, tapping again to search),
  // while the dialog's mic button calls startHold/stopHold directly on click.
  const toggle = useCallback(() => {
    if (busyRef.current) return;
    if (listeningRef.current) stopHold();
    else if (!startingRef.current) startHold();
  }, [startHold, stopHold]);

  const runText = useCallback(async (query) => {
    const q = String(query || '').trim();
    if (!q || busyRef.current) return;
    setBusyBoth(true);
    setError('');
    setStatus(`Searching for “${q}”…`);
    try {
      const data = await api.search(q);
      setResults(data.results || []);
      const count = (data.results || []).length;
      setStatus(count ? `${count} result${count === 1 ? '' : 's'} for “${q}”.` : `No results for “${q}”.`);
      say(`${count} result${count === 1 ? '' : 's'} for ${q}.`);
    } catch (err) {
      setError(err.message);
      setStatus('');
      say(err.message, true);
    } finally {
      setBusyBoth(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResults([]);
    setTranscript('');
    setStatus('');
    setError('');
  }, []);

  return {
    voiceEnabled,
    listening,
    busy,
    results,
    transcript,
    status,
    error,
    startHold,
    stopHold,
    toggle,
    runText,
    reset,
  };
}

export default useVoiceSearch;
