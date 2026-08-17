/**
 * Shruti — accessible player shell.
 *
 * Holds the session state machine (idle -> processing -> ready) and wires the
 * pieces together: player clock, description scheduler, speech, announcements,
 * and the interactive assistant.
 *
 * Language runs through this file in two directions. The interface language
 * decides what everything on screen says, what the screen reader announces, and
 * what language new descriptions and answers are *generated* in. The video's
 * own language, carried on the timeline, decides which speech voice reads a
 * description aloud — a timeline built in Bangla stays Bangla even if the
 * interface is later switched to English, because regenerating it would mean
 * re-processing the whole video. Answers, generated live, follow the interface
 * immediately.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api, { apiUrl } from './lib/api.js';
import useAnnouncer from './hooks/useAnnouncer.js';
import useSettings from './hooks/useSettings.js';
import useSpeech from './hooks/useSpeech.js';
import useYouTubePlayer, { PLAYER_STATE } from './hooks/useYouTubePlayer.js';
import useDescriptionScheduler from './hooks/useDescriptionScheduler.js';
import useKeyboardShortcuts, { keyCap } from './hooks/useKeyboardShortcuts.js';
import useVoiceSearch from './hooks/useVoiceSearch.js';
import { useI18n, spokenTime } from './i18n/index.jsx';
import LiveRegions from './components/LiveRegions.jsx';
import Icon from './components/Icon.jsx';
import LanguageSwitch from './components/LanguageSwitch.jsx';
import UrlForm from './components/UrlForm.jsx';
import ExampleVideos from './components/ExampleVideos.jsx';
import ProcessingStatus from './components/ProcessingStatus.jsx';
import PlayerPanel from './components/PlayerPanel.jsx';
import QuestionPanel from './components/QuestionPanel.jsx';
import DescriptionTimeline from './components/DescriptionTimeline.jsx';
import SettingsPanel from './components/SettingsPanel.jsx';
import ShortcutsDialog from './components/ShortcutsDialog.jsx';
import SearchDialog from './components/SearchDialog.jsx';
import SettingsDialog from './components/SettingsDialog.jsx';

const POLL_MS = 1200;

export default function App() {
  const { settings, update, toggle } = useSettings();
  const { polite, assertive, announce } = useAnnouncer();
  const { lang, t } = useI18n();

  const [phase, setPhase] = useState('idle');
  const [videoId, setVideoId] = useState(null);
  const [info, setInfo] = useState(null);
  const [job, setJob] = useState(null);
  const [timeline, setTimeline] = useState(null);

  // The language this timeline was generated in drives which speech voice reads
  // its descriptions. Until one loads, the interface language is the best guess.
  const activeLanguage = timeline?.language || null;
  const speechLang = activeLanguage?.code || lang;
  const speech = useSpeech(
    useMemo(() => ({ ...settings, lang: speechLang }), [settings, speechLang]),
  );

  /** Say a duration the way this language says one. */
  const sayTime = useCallback((seconds) => spokenTime(seconds, t), [t]);

  const [formError, setFormError] = useState('');
  const [modelInfo, setModelInfo] = useState(null);
  const [presets, setPresets] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [muted, setMuted] = useState(false);
  const [asking, setAsking] = useState(false);
  const [askQuestion, setAskQuestion] = useState('');
  const [lastAnswer, setLastAnswer] = useState(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [keyHud, setKeyHud] = useState(null);

  // Voice + text search. Push-to-talk (hold W) and the dialog share this state.
  // A *spoken* search plays the top result straight away (hands-free); if there
  // was nothing to play, the dialog opens so the learner can retry or type.
  const voice = useVoiceSearch({
    announce,
    onResults: (found) => {
      if (found && found.length) {
        setSearchOpen(false);
        announce(t('announce.playingResult', { title: found[0].title }), { assertive: true });
        handleSubmit(found[0].url);
      } else {
        setSearchOpen(true);
      }
    },
  });

  const playButtonRef = useRef(null);
  const lastAnnouncedPercent = useRef(-1);

  // A brief centre-screen flash of the key that was just pressed (2, J, →, …) so
  // the interaction is visible on screen recordings. Each press re-mounts the
  // element (via a bumping id) so the fade-out animation replays every time.
  const keyHudTimer = useRef(null);
  const keyHudSeq = useRef(0);
  const flashKey = useCallback((key, label) => {
    keyHudSeq.current += 1;
    setKeyHud({ id: keyHudSeq.current, cap: keyCap(key), label });
    clearTimeout(keyHudTimer.current);
    keyHudTimer.current = setTimeout(() => setKeyHud(null), 900);
  }, []);
  useEffect(() => () => clearTimeout(keyHudTimer.current), []);

  // Voice-search errors are shown as a pill on the landing page; clear them
  // after a few seconds so the pill does not linger.
  useEffect(() => {
    if (!voice.error) return undefined;
    const timer = setTimeout(() => voice.reset(), 6000);
    return () => clearTimeout(timer);
  }, [voice.error, voice.reset]);

  // True whenever Shruti has paused the video specifically so it can speak
  // (an extended description, an overlap hold, or a Q&A answer). The scheduler
  // and the Q&A flow both write it; the player-state handler reads it. It stays
  // true across a PAUSED→BUFFERING→PLAYING resume, so the fix does not depend on
  // catching one exact transition.
  const holdingPlaybackRef = useRef(false);
  const askingRef = useRef(false);
  askingRef.current = asking;

  /**
   * Enforce the one rule everything else serves: the instructor and Shruti
   * are never audible at once. If the learner forces the video to resume — the
   * play button, the space bar, or clicking the YouTube player directly — while
   * Shruti had paused it to speak, stop speaking rather than talk over the
   * returning narration.
   *
   * We key off "the video is supposed to be held for speech" rather than a
   * specific state transition, because YouTube resumes via PAUSED → BUFFERING →
   * PLAYING and an earlier version that watched for a direct paused→playing step
   * missed the buffering case and let the voices overlap. `holdingPlaybackRef`
   * is cleared before our own resume, so a normal end-of-description never trips
   * this; `speechSynthesis.speaking` is live ground truth for "still talking".
   */
  const handlePlayerState = useCallback(
    (playerState) => {
      const speakingNow =
        typeof window !== 'undefined' && window.speechSynthesis
          ? window.speechSynthesis.speaking
          : false;
      if (
        playerState === PLAYER_STATE.PLAYING &&
        (holdingPlaybackRef.current || askingRef.current) &&
        speakingNow
      ) {
        speech.cancel();
        announce(t('announce.overlapStopped'), { assertive: true });
      }
    },
    [speech, announce, t],
  );

  const { containerRef, ready, state, duration, error: playerError, controls } = useYouTubePlayer({
    videoId: phase === 'ready' ? videoId : null,
    onStateChange: handlePlayerState,
  });

  const isPlaying = state === PLAYER_STATE.PLAYING || state === PLAYER_STATE.BUFFERING;

  /* ----------------------------------------------------------------- speech */

  /**
   * Speaks, ducking the video underneath so a description is never fighting
   * background music for the learner's attention.
   */
  const speakDucked = useCallback(
    async (text, overrides) => {
      const shouldDuck = settings.duckVideo && ready;
      let previousVolume = null;
      if (shouldDuck) {
        previousVolume = controls.getVolume();
        controls.setVolume(Math.min(previousVolume, 20));
      }
      try {
        return await speech.speak(text, overrides);
      } finally {
        if (shouldDuck && previousVolume != null) controls.setVolume(previousVolume);
      }
    },
    [controls, ready, settings.duckVideo, speech],
  );

  /**
   * Announce to the screen reader, and optionally speak it too. Status messages
   * are interface text, so they are always spoken in the interface language,
   * never in the video's.
   */
  const report = useCallback(
    (message, options = {}) => {
      announce(message, options);
      if (settings.speakStatus) speech.speak(message, { lang });
    },
    [announce, settings.speakStatus, speech, lang],
  );

  /* ------------------------------------------------------------- scheduling */

  const descriptions = useMemo(() => timeline?.descriptions ?? [], [timeline]);

  const scheduler = useDescriptionScheduler({
    descriptions,
    controls,
    enabled: settings.descriptionsEnabled,
    isPlaying,
    speak: useCallback(
      (text) => speakDucked(text, { lang: speechLang }),
      [speakDucked, speechLang],
    ),
    holdingPlaybackRef,
    onSpoken: useCallback(
      (entry) =>
        announce(
          t(entry.mode === 'explain' ? 'announce.fullDescription' : 'announce.description', {
            text: entry.description,
          }),
        ),
      [announce, t],
    ),
  });

  /* ------------------------------------------------------------- lifecycle  */

  useEffect(() => {
    api
      .config()
      .then((cfg) => setModelInfo(cfg.ai))
      .catch(() => setModelInfo(null));
    api
      .presets()
      .then((data) => setPresets(data.presets || []))
      .catch(() => setPresets([]));
  }, []);

  // Once, on arrival. A later language switch is confirmed by the effect below
  // rather than by repeating the whole welcome.
  useEffect(() => {
    announce(t('announce.welcome'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Confirm a language change in the language just chosen, so the learner hears
  // that it took effect. Skipped on first render.
  const previousLang = useRef(lang);
  useEffect(() => {
    if (previousLang.current === lang) return;
    previousLang.current = lang;
    report(t('announce.languageChanged'), { assertive: true });
    // `report` and `t` both change with the language; depending on `lang` alone
    // is deliberate, so this fires exactly once per switch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  // Voice search: press W to start recording, press W again (or wait for the
  // auto-stop) to send it. A single tap toggles, so speaking after the press
  // works naturally. Key repeats from holding W are ignored, and W is swallowed
  // so it never leaks into a focused field.
  useEffect(() => {
    const isTyping = (el) => {
      const tag = el?.tagName?.toLowerCase();
      return tag === 'input' || tag === 'textarea' || tag === 'select' || el?.isContentEditable === true;
    };
    const isW = (event) =>
      event.key && event.key.toLowerCase() === 'w' && !event.ctrlKey && !event.metaKey && !event.altKey;

    const onKeyDown = (event) => {
      if (!isW(event)) return;
      if (event.repeat) {
        event.preventDefault();
        return;
      }
      if (isTyping(event.target)) return; // a real 'w' being typed
      event.preventDefault();
      flashKey('w', t('shortcuts.voiceSearch'));
      if (voice.voiceEnabled) voice.toggle();
      else setSearchOpen(true); // no mic/voice configured — open the typed search
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [voice.voiceEnabled, voice.toggle, flashKey, t]);

  // Player clock — drives the position display and the timeline highlight.
  useEffect(() => {
    if (phase !== 'ready' || !ready) return undefined;
    const timer = setInterval(() => setCurrentTime(controls.getTime()), 250);
    return () => clearInterval(timer);
  }, [phase, ready, controls]);

  useEffect(() => {
    if (playerError) report(playerError, { assertive: true });
  }, [playerError, report]);

  useEffect(() => {
    if (phase !== 'ready' || !ready) return undefined;
    report(
      descriptions.length === 1
        ? t('announce.readyOne')
        : t('announce.readyMany', { count: descriptions.length }),
    );
    // The processing job was itself started by a real click, but that user
    // gesture is long expired by the time the video finishes preparing, so
    // browsers are free to block this autoplay. Try it anyway, then check
    // whether it actually took — if it didn't, fall back to the accessible
    // manual-start path instead of leaving a blind learner stuck on a silent
    // player with no idea anything is wrong.
    controls.play();
    const timer = setTimeout(() => {
      const playerState = controls.getState();
      const autoplaySucceeded =
        playerState === PLAYER_STATE.PLAYING || playerState === PLAYER_STATE.BUFFERING;
      if (!autoplaySucceeded) {
        playButtonRef.current?.focus();
        report(t('announce.pressSpace'), { assertive: true });
      }
    }, 1500);
    return () => clearTimeout(timer);
    // Announce/attempt once, when the player becomes usable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, ready]);

  // Tell the learner what language descriptions will be in, and warn — rather
  // than silently mangle speech — when the device has no voice for it. Voices
  // can load asynchronously, so this re-runs as `voiceAvailable` settles.
  useEffect(() => {
    if (phase !== 'ready' || !activeLanguage || activeLanguage.isEnglish || !speech.supported) {
      return;
    }
    if (speech.voiceAvailable) {
      announce(t('announce.spokenIn', { language: activeLanguage.name }));
    } else {
      report(t('announce.noVoice', { language: activeLanguage.name }), { assertive: true });
    }
  }, [phase, activeLanguage, speech.voiceAvailable, speech.supported, announce, report, t]);

  /* ------------------------------------------------------------- processing */

  const handleSubmit = useCallback(
    async (url) => {
      // Loading a new video while one is already playing/processing: stop
      // whatever the learner is currently hearing so the two don't overlap,
      // and let the old player unmount (it goes away once phase leaves 'ready').
      speech.cancel();
      controls.pause();
      setFormError('');
      setTimeline(null);
      setLastAnswer(null);
      lastAnnouncedPercent.current = -1;

      try {
        report(t('announce.lookingUp'));
        const videoInfo = await api.videoInfo(url);
        setInfo(videoInfo);
        setVideoId(videoInfo.videoId);
        setPhase('processing');
        report(
          t('announce.found', {
            title: videoInfo.title,
            duration: sayTime(videoInfo.duration),
          }),
        );

        // Descriptions are generated in the interface language, so a learner
        // reading the app in Bangla hears the video described in Bangla.
        const started = await api.startProcessing(url, { outputLang: lang });
        setJob(started);
      } catch (err) {
        setFormError(err.message);
        setPhase('idle');
        report(err.message, { assertive: true });
      }
    },
    [report, speech, controls, t, sayTime, lang],
  );

  // Deep link: /?v=<id-or-url> loads that video on arrival, so a search or a
  // shared link can jump straight in.
  const deepLinkedRef = useRef(false);
  useEffect(() => {
    if (deepLinkedRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const target = params.get('v') || params.get('url');
    if (target) {
      deepLinkedRef.current = true;
      handleSubmit(target);
    }
  }, [handleSubmit]);

  // Poll the processing job and narrate its progress.
  useEffect(() => {
    if (phase !== 'processing' || !job?.jobId) return undefined;
    let cancelled = false;

    const poll = async () => {
      try {
        const status = await api.jobStatus(job.jobId);
        if (cancelled) return;
        setJob(status);

        const bucket = Math.floor((status.percent || 0) / 20) * 20;
        if (bucket > lastAnnouncedPercent.current && status.status === 'running') {
          lastAnnouncedPercent.current = bucket;
          announce(t('announce.progress', { percent: bucket, message: status.message }));
        }

        if (status.status === 'done') {
          setTimeline(status.result);
          setPhase('ready');
          return;
        }
        if (status.status === 'error') {
          setPhase('idle');
          setFormError(status.error?.message || t('processing.stage.error'));
          report(t('announce.processingFailed', { message: status.error?.message || '' }), {
            assertive: true,
          });
          return;
        }
        setTimeout(poll, POLL_MS);
      } catch (err) {
        if (cancelled) return;
        setPhase('idle');
        setFormError(err.message);
        report(t('announce.processingFailed', { message: err.message }), { assertive: true });
      }
    };

    const timer = setTimeout(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [phase, job?.jobId, announce, report, t]);

  const reset = useCallback(() => {
    speech.cancel();
    setPhase('idle');
    setVideoId(null);
    setTimeline(null);
    setJob(null);
    setInfo(null);
    setLastAnswer(null);
    report(t('announce.returned'));
  }, [report, speech, t]);

  /* ---------------------------------------------------------------- actions */

  const togglePlay = useCallback(() => {
    if (!ready) return;
    if (isPlaying) {
      controls.pause();
      announce(t('announce.paused'));
    } else {
      controls.play();
      announce(t('announce.playing'));
    }
  }, [ready, isPlaying, controls, announce, t]);

  const seekBy = useCallback(
    (delta) => {
      if (!ready) return;
      const target = Math.max(0, Math.min(controls.getTime() + delta, duration || Infinity));
      controls.seekTo(target);
      setCurrentTime(target);
      announce(
        t(delta > 0 ? 'announce.seekForward' : 'announce.seekBack', {
          seconds: Math.abs(delta),
          position: sayTime(target),
        }),
      );
    },
    [ready, controls, duration, announce, t, sayTime],
  );

  const seekTo = useCallback(
    (seconds) => {
      if (!ready) return;
      controls.seekTo(seconds);
      setCurrentTime(seconds);
    },
    [ready, controls],
  );

  const toggleMute = useCallback(() => {
    if (!ready) return;
    const next = !controls.isMuted();
    if (next) controls.mute();
    else controls.unMute();
    setMuted(next);
    announce(t(next ? 'announce.muted' : 'announce.unmuted'));
  }, [ready, controls, announce, t]);

  const toggleDescriptions = useCallback(() => {
    const next = toggle('descriptionsEnabled');
    announce(t(next ? 'announce.descriptionsOn' : 'announce.descriptionsOff'));
  }, [toggle, announce, t]);

  /**
   * Skip whatever Shruti is currently saying — a description or an answer.
   * Cancelling the speech resolves the in-flight `speak()`, which lets the
   * scheduler's (or Q&A's) cleanup resume the video if it had been paused for
   * this description. The learner is never stranded in a pause.
   */
  const skipSpeech = useCallback(() => {
    if (speech.speaking || scheduler.busy || asking) {
      speech.cancel();
      announce(t('announce.skipped'), { assertive: true });
    } else {
      announce(t('announce.nothingSpeaking'));
    }
  }, [speech, scheduler.busy, asking, announce, t]);

  const changeRate = useCallback(
    (delta) => {
      const next = Math.max(0.5, Math.min(2.5, Number((settings.rate + delta).toFixed(1))));
      update({ rate: next });
      announce(t('announce.speechRate', { rate: next.toFixed(1) }));
    },
    [settings.rate, update, announce, t],
  );

  /**
   * Interactive Q&A: pause, look at the current frame, answer, resume exactly
   * where the learner left off.
   *
   * Unlike a description, an answer is generated on the spot, so it is asked for
   * in the interface language rather than the one the timeline was built in.
   */
  const ask = useCallback(
    async ({ question, presetId }) => {
      if (!videoId || asking) return;
      const wasPlaying = isPlaying;
      const time = controls.getTime();

      setAsking(true);
      setAskQuestion(question);
      controls.pause();
      // The video is now held for the answer; if the learner force-plays while
      // it is being spoken, the player-state handler stops the speech.
      holdingPlaybackRef.current = true;
      speech.cancel();
      announce(t('announce.asking', { question }), { assertive: true });

      try {
        const answer = await api.askFrame({ videoId, time, question, presetId, outputLang: lang });
        setLastAnswer({ ...answer, question });
        // An answer Gemma could not ground in the frame is spoken with that
        // warning attached — the visual panel marks it, and this is how the
        // same caveat reaches someone who only hears it.
        const spoken = answer.grounded
          ? answer.answer
          : t('announce.notCertain', { answer: answer.answer });
        await speakDucked(spoken, { lang: answer.language?.code || lang });
      } catch (err) {
        setLastAnswer({ question, answer: err.message, grounded: false, time });
        await speech.speak(t('announce.answerFailed', { message: err.message }), { lang });
      } finally {
        // Clear the hold before our own resume so it is not mistaken for a
        // force-play and does not cancel the answer we just finished.
        holdingPlaybackRef.current = false;
        setAsking(false);
        if (wasPlaying) controls.play();
      }
    },
    [videoId, asking, isPlaying, controls, speech, speakDucked, announce, t, lang],
  );

  const askPreset = useCallback(
    (index) => {
      const preset = presets[index];
      if (preset) ask({ presetId: preset.id, question: preset.question });
    },
    [presets, ask],
  );

  /** Translated preset label, falling back to the English one the server sent. */
  const presetLabel = useCallback(
    (preset) => {
      const key = `preset.${preset.id}`;
      const translated = t(key);
      return translated === key ? preset.label : translated;
    },
    [t],
  );

  /* -------------------------------------------------------------- shortcuts */

  const bindings = useMemo(() => {
    const playback = t('shortcuts.group.playback');
    const descriptionGroup = t('shortcuts.group.descriptions');
    const askGroup = t('shortcuts.group.ask');
    const general = t('shortcuts.group.general');

    return [
      { keys: [' ', 'k'], label: t('shortcuts.playPause'), group: playback, run: togglePlay },
      { keys: ['ArrowLeft'], label: t('shortcuts.back5'), group: playback, run: () => seekBy(-5) },
      { keys: ['ArrowRight'], label: t('shortcuts.forward5'), group: playback, run: () => seekBy(5) },
      { keys: ['j'], label: t('shortcuts.back10'), group: playback, run: () => seekBy(-10) },
      { keys: ['l'], label: t('shortcuts.forward10'), group: playback, run: () => seekBy(10) },
      { keys: ['Home'], label: t('shortcuts.toStart'), group: playback, run: () => seekTo(0) },
      { keys: ['m'], label: t('shortcuts.mute'), group: playback, run: toggleMute },
      {
        keys: ['t'],
        label: t('shortcuts.sayPosition'),
        group: playback,
        run: () =>
          announce(
            t('announce.position', {
              current: sayTime(controls.getTime()),
              total: sayTime(duration),
            }),
          ),
      },
      {
        keys: ['d'],
        label: t('shortcuts.toggleDescriptions'),
        group: descriptionGroup,
        run: toggleDescriptions,
      },
      { keys: ['s'], label: t('shortcuts.skip'), group: descriptionGroup, run: skipSpeech },
      {
        keys: ['r'],
        label: t('shortcuts.replay'),
        group: descriptionGroup,
        run: () => {
          if (!scheduler.repeatLast()) announce(t('announce.nothingDescribed'));
        },
      },
      { keys: [','], label: t('shortcuts.slower'), group: descriptionGroup, run: () => changeRate(-0.1) },
      { keys: ['.'], label: t('shortcuts.faster'), group: descriptionGroup, run: () => changeRate(0.1) },
      {
        keys: ['a'],
        label: t('shortcuts.questionBox'),
        group: askGroup,
        run: () => {
          document.getElementById('question-input')?.focus();
          announce(t('announce.questionBox'));
        },
      },
      ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({
        keys: [String(n)],
        label: presets[n - 1] ? presetLabel(presets[n - 1]) : t('shortcuts.question', { number: n }),
        group: askGroup,
        run: () => askPreset(n - 1),
        hidden: !presets[n - 1],
      })),
      {
        // The real voice-search behaviour lives in a dedicated keydown listener
        // above (this entry documents it in the shortcuts dialog).
        keys: ['w'],
        label: t('shortcuts.voiceSearch'),
        group: general,
        run: () => {},
      },
      {
        keys: ['Escape'],
        label: t('shortcuts.stopSpeaking'),
        group: general,
        allowWhileTyping: true,
        run: () => {
          speech.cancel();
          setShowShortcuts(false);
        },
      },
      {
        keys: ['?', '/'],
        label: t('shortcuts.showShortcuts'),
        group: general,
        run: () => setShowShortcuts((open) => !open),
      },
    ];
  }, [
    togglePlay,
    seekBy,
    seekTo,
    toggleMute,
    toggleDescriptions,
    skipSpeech,
    changeRate,
    scheduler,
    presets,
    presetLabel,
    askPreset,
    speech,
    announce,
    controls,
    duration,
    t,
    sayTime,
  ]);

  useKeyboardShortcuts(bindings, {
    enabled: phase === 'ready' && !showShortcuts && !searchOpen,
    onFire: ({ key, label }) => flashKey(key, label),
  });
  useKeyboardShortcuts(
    bindings.filter(
      (b) => b.keys.includes('?') || b.keys.includes('Escape') || b.keys.includes('w'),
    ),
    {
      enabled: (phase !== 'ready' || showShortcuts) && !searchOpen,
      onFire: ({ key, label }) => flashKey(key, label),
    },
  );

  /* ------------------------------------------------------------------ render */

  const settingsPanel = (
    <SettingsPanel
      settings={settings}
      update={update}
      voices={speech.voices}
      language={activeLanguage}
      voiceAvailable={speech.voiceAvailable}
      onTestVoice={() => speech.speak(t('settings.testVoiceSample'), { lang: speechLang })}
    />
  );

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        {t('app.skipToMain')}
      </a>

      <LiveRegions polite={polite} assertive={assertive} />

      <header className="app-header">
        <div className="brand">
          <img className="brand-logo" src="/logo.svg" alt="" />
          <div>
            <h1 className="wordmark">Shruti</h1>
            <p className="tagline">{t('app.tagline')}</p>
          </div>
        </div>

        <div className="header-actions">
          <LanguageSwitch />
          {phase !== 'idle' && (
            <button type="button" className="secondary" onClick={reset}>
              <Icon name="home" size={18} />
              {t('app.home')}
            </button>
          )}
          <button
            type="button"
            className="secondary search-open-btn"
            onClick={() => setSearchOpen(true)}
          >
            <Icon name="search" size={18} />
            {t('app.findVideo')}
            <kbd className="kbd">W</kbd>
          </button>
          <button
            type="button"
            className="secondary icon-only"
            onClick={() => setSettingsOpen(true)}
            aria-label={t('app.settingsLabel')}
          >
            <Icon name="settings" size={20} />
          </button>
        </div>
      </header>

      <main id="main" tabIndex={-1}>
        {phase === 'idle' && (
          <div className="stage">
            <UrlForm onSubmit={handleSubmit} busy={false} error={formError} />
            <ExampleVideos onPick={handleSubmit} busy={false} />
          </div>
        )}

        {phase === 'processing' && (
          <div className="stage">
            <ProcessingStatus job={job} videoTitle={info?.title} onCancel={reset} />
          </div>
        )}

        {phase === 'ready' && (
          <div className="ready-layout">
            <PlayerPanel
              ref={playButtonRef}
              containerRef={containerRef}
              title={info?.title}
              language={activeLanguage}
              currentTime={currentTime}
              duration={duration || info?.duration || 0}
              isPlaying={isPlaying}
              descriptionsEnabled={settings.descriptionsEnabled}
              descriptionCount={descriptions.length}
              muted={muted}
              speaking={speech.speaking}
              onPlayPause={togglePlay}
              onSeek={seekTo}
              onSeekBy={seekBy}
              onToggleDescriptions={toggleDescriptions}
              onToggleMute={toggleMute}
              onSkip={skipSpeech}
              onRepeat={() => {
                if (!scheduler.repeatLast()) announce(t('announce.nothingDescribed'));
              }}
            />

            <QuestionPanel
              presets={presets}
              onAsk={ask}
              busy={asking}
              lastAnswer={lastAnswer}
              disabled={!ready}
            />

            <DescriptionTimeline
              descriptions={descriptions}
              currentTime={currentTime}
              stats={timeline?.stats}
              onJump={(entry) => {
                scheduler.jumpTo(entry);
                announce(t('announce.jumped', { position: sayTime(entry.time) }));
              }}
            />

            <button type="button" className="secondary reset-btn" onClick={reset}>
              <Icon name="replay" size={18} />
              {t('app.chooseDifferent')}
            </button>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <div className="footer-brand">
          <img src="/logo.svg" alt="" />
          <p>{t('app.footerModel', { model: modelInfo?.model || 'Gemma' })}</p>
        </div>
        <div className="footer-actions">
          <a href={apiUrl('/api/config')} target="_blank" rel="noreferrer">
            <Icon name="external" size={16} />
            {t('app.modelConfig')}
          </a>
          <button type="button" className="secondary" onClick={() => setShowShortcuts(true)}>
            <Icon name="keyboard" size={18} />
            {t('app.keyboardShortcuts')}
          </button>
        </div>
      </footer>

      <ShortcutsDialog
        open={showShortcuts}
        onClose={() => setShowShortcuts(false)}
        bindings={bindings}
      />

      <SearchDialog
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onPick={(url) => {
          setSearchOpen(false);
          handleSubmit(url);
        }}
        voice={voice}
      />

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)}>
        {settingsPanel}
      </SettingsDialog>

      {(voice.listening || voice.busy || voice.error) && (
        <div className={`voice-overlay${voice.error ? ' voice-error' : ''}`} role="status">
          <img src="/logo.svg" alt="" />
          <div className="voice-overlay-text">
            <strong>
              {voice.error
                ? t('voice.title')
                : voice.listening
                  ? t('voice.listening')
                  : t('voice.transcribing')}
            </strong>
            <span>
              {voice.error
                ? voice.error
                : voice.listening
                  ? t('voice.speakNow', { key: 'W' })
                  : t('voice.oneMoment')}
            </span>
          </div>
          {voice.listening && (
            <span className="speaking-wave" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
              <span />
            </span>
          )}
        </div>
      )}

      {/* Asking Gemma: pops up the instant a preset (or number key) is pressed,
          so there is immediate visual feedback while Gemma looks at the frame. */}
      {asking && (
        <div className="voice-overlay asking-overlay" role="status">
          <img src="/logo.svg" alt="" />
          <div className="voice-overlay-text">
            <strong>{speech.speaking ? t('voice.answering') : t('voice.askingGemma')}</strong>
            {askQuestion && <span>{askQuestion}</span>}
          </div>
          <span className="speaking-wave" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
          </span>
        </div>
      )}

      {/* Centre-screen keystroke flash — shows which key was pressed (2, J, →)
          so shortcuts are visible on a screen recording. Decorative only. */}
      {keyHud && (
        <div className="key-hud" key={keyHud.id} aria-hidden="true">
          <kbd>{keyHud.cap}</kbd>
          {keyHud.label && <span>{keyHud.label}</span>}
        </div>
      )}
    </div>
  );
}
