/**
 * The playback scheduler (spec §8).
 *
 * Ticks every 100ms against the player clock and speaks a description when its
 * timestamp arrives. Two speaking modes, and one rule that governs both: the
 * instructor's narration and Shruti must never overlap.
 *
 *  Case 1 — a natural pause exists: speak over the silence. If the description
 *           is still running when narration is due to resume, pause the video
 *           until it finishes rather than talking across the instructor.
 *  Case 2 — no pause exists: pause the video, speak, resume (Extended AD).
 */
import { useCallback, useEffect, useRef, useState } from 'react';

const TICK_MS = 100;
/** How far past a timestamp we will still fire it (seek/lag tolerance). */
const FIRE_WINDOW = 1.5;

export function useDescriptionScheduler({
  descriptions = [],
  controls,
  enabled = true,
  isPlaying = false,
  speak,
  onSpoken,
  holdingPlaybackRef,
}) {
  const [lastSpoken, setLastSpoken] = useState(null);
  const [busy, setBusy] = useState(false);

  const spokenRef = useRef(new Set());
  // Shared with the app: true while this scheduler has paused the video to speak
  // a description, so a force-play can be detected and the speech stopped rather
  // than left to overlap the narration. Falls back to a local ref if unwired.
  const localHoldRef = useRef(false);
  const holdRef = holdingPlaybackRef || localHoldRef;
  const busyRef = useRef(false);
  const lastTimeRef = useRef(0);
  const descriptionsRef = useRef(descriptions);
  const enabledRef = useRef(enabled);
  const speakRef = useRef(speak);
  const onSpokenRef = useRef(onSpoken);

  descriptionsRef.current = descriptions;
  enabledRef.current = enabled;
  speakRef.current = speak;
  onSpokenRef.current = onSpoken;

  // A new timeline means nothing has been spoken yet.
  useEffect(() => {
    spokenRef.current = new Set();
    setLastSpoken(null);
  }, [descriptions]);

  /** Speaks one entry, holding the video back if narration would collide. */
  const deliver = useCallback(
    async (entry) => {
      busyRef.current = true;
      setBusy(true);

      const wasPlaying = isPlayingNow(controls);
      let heldForOverlap = false;
      let overlapTimer = null;

      try {
        if (entry.requiresPause && wasPlaying) {
          controls.pause();
          // We now own the pause: if the learner forces playback back on while
          // we speak, the app's player-state handler will cut the speech.
          holdRef.current = true;
        } else if (wasPlaying && Number.isFinite(entry.gapEnd)) {
          // Case 1 with a safety net: if we are still speaking when the
          // instructor is due back, pause instead of overlapping.
          const now = controls.getTime();
          const silenceLeft = (entry.gapEnd - now) * 1000;
          overlapTimer = setTimeout(
            () => {
              heldForOverlap = true;
              controls.pause();
              holdRef.current = true;
            },
            Math.max(150, silenceLeft),
          );
        }

        setLastSpoken(entry);
        onSpokenRef.current?.(entry);

        await speakRef.current(entry.description);
      } finally {
        if (overlapTimer) clearTimeout(overlapTimer);
        // Release the hold before resuming, so our own resume is not mistaken
        // for a force-play and does not cancel the next description.
        holdRef.current = false;
        if (wasPlaying && (entry.requiresPause || heldForOverlap)) controls.play();
        busyRef.current = false;
        setBusy(false);
      }
    },
    [controls],
  );

  useEffect(() => {
    if (!isPlaying) return undefined;

    const timer = setInterval(() => {
      const time = controls.getTime();

      // Seeking backwards re-arms everything after the new position, so a
      // learner who rewinds hears the descriptions again.
      if (time < lastTimeRef.current - FIRE_WINDOW) {
        for (const key of [...spokenRef.current]) {
          if (Number(key) > time) spokenRef.current.delete(key);
        }
      }
      lastTimeRef.current = time;

      if (!enabledRef.current || busyRef.current) return;

      const due = descriptionsRef.current.find(
        (entry) =>
          !spokenRef.current.has(entry.time) &&
          entry.time <= time + 0.05 &&
          entry.time >= time - FIRE_WINDOW,
      );
      if (!due) return;

      // Anything we skipped past (a big seek) is marked as handled so it does
      // not fire late and describe a frame that is no longer on screen.
      for (const entry of descriptionsRef.current) {
        if (entry.time < time - FIRE_WINDOW) spokenRef.current.add(entry.time);
      }

      spokenRef.current.add(due.time);
      deliver(due);
    }, TICK_MS);

    return () => clearInterval(timer);
  }, [isPlaying, controls, deliver]);

  /**
   * "R" — say the last description again. If the video is playing (the narration
   * may be mid-sentence), pause it so the replay does not overlap the
   * instructor, then resume where the learner left off — the same never-overlap
   * rule that governs a live description. A force-play during the replay stops
   * it, via the shared hold flag.
   *
   * Returns false synchronously when there is nothing to replay so the caller's
   * "nothing yet" message still works; otherwise starts the replay and returns
   * true.
   */
  const repeatLast = useCallback(() => {
    if (!lastSpoken) return false;
    (async () => {
      const wasPlaying = isPlayingNow(controls);
      if (wasPlaying) {
        controls.pause();
        holdRef.current = true;
      }
      try {
        await speakRef.current(lastSpoken.description);
      } finally {
        holdRef.current = false;
        if (wasPlaying) controls.play();
      }
    })();
    return true;
  }, [lastSpoken, controls]);

  /** Jump to a description and hear it in context. */
  const jumpTo = useCallback(
    (entry) => {
      spokenRef.current.delete(entry.time);
      controls.seekTo(Math.max(0, entry.time - 0.5));
    },
    [controls],
  );

  return { lastSpoken, busy, repeatLast, jumpTo };
}

function isPlayingNow(controls) {
  // 1 = playing, 3 = buffering; both mean "the learner expects it to continue".
  const state = controls.getState();
  return state === 1 || state === 3;
}

export default useDescriptionScheduler;
