/**
 * YouTube IFrame player, wrapped in a promise-friendly imperative API.
 *
 * Playback happens in the real YouTube player (so watching stays within
 * YouTube's terms); the pixels Gemma reasons about come from the backend copy.
 * Both are the same video, so timestamps line up.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

let apiPromise = null;

/** Loads the IFrame API once per page. */
function loadYouTubeApi() {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    if (window.YT?.Player) {
      resolve(window.YT);
      return;
    }
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT);
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => reject(new Error('Could not load the YouTube player.'));
    document.head.appendChild(script);
  });
  return apiPromise;
}

export const PLAYER_STATE = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
};

/**
 * @param {object} args
 * @param {string|null} args.videoId
 * @param {(state:number) => void} [args.onStateChange]
 */
export function useYouTubePlayer({ videoId, onStateChange }) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [state, setState] = useState(PLAYER_STATE.UNSTARTED);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(null);
  const stateHandler = useRef(onStateChange);
  stateHandler.current = onStateChange;

  useEffect(() => {
    if (!videoId || !containerRef.current) return undefined;
    let cancelled = false;
    let player = null;

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled || !containerRef.current) return;
        player = new YT.Player(containerRef.current, {
          videoId,
          playerVars: {
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            // Native YouTube keyboard control is redundant here and steals
            // keystrokes from Shruti's own accessible shortcuts.
            disablekb: 1,
          },
          events: {
            onReady: (event) => {
              if (cancelled) return;
              playerRef.current = event.target;
              setDuration(event.target.getDuration() || 0);
              setReady(true);
            },
            onStateChange: (event) => {
              if (cancelled) return;
              setState(event.data);
              if (event.data === PLAYER_STATE.PLAYING) {
                setDuration(event.target.getDuration() || 0);
              }
              stateHandler.current?.(event.data);
            },
            onError: () => {
              if (!cancelled) setError('This video cannot be played in an embedded player.');
            },
          },
        });
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });

    return () => {
      cancelled = true;
      setReady(false);
      try {
        (playerRef.current || player)?.destroy?.();
      } catch {
        /* player already gone */
      }
      playerRef.current = null;
    };
  }, [videoId]);

  const call = useCallback((method, ...args) => {
    const player = playerRef.current;
    if (!player || typeof player[method] !== 'function') return undefined;
    try {
      return player[method](...args);
    } catch {
      return undefined;
    }
  }, []);

  // Stable identity: the scheduler depends on `controls`, and a fresh object
  // every render would tear down and rebuild its 100ms tick constantly.
  const controls = useMemo(
    () => ({
      play: () => call('playVideo'),
      pause: () => call('pauseVideo'),
      seekTo: (seconds, allowSeekAhead = true) =>
        call('seekTo', Math.max(0, seconds), allowSeekAhead),
      getTime: () => call('getCurrentTime') || 0,
      getDuration: () => call('getDuration') || 0,
      getState: () => call('getPlayerState') ?? PLAYER_STATE.UNSTARTED,
      setVolume: (value) => call('setVolume', Math.max(0, Math.min(100, value))),
      getVolume: () => call('getVolume') ?? 100,
      mute: () => call('mute'),
      unMute: () => call('unMute'),
      isMuted: () => call('isMuted') ?? false,
      setPlaybackRate: (value) => call('setPlaybackRate', value),
    }),
    [call],
  );

  return { containerRef, ready, state, duration, error, controls, playerRef };
}

export default useYouTubePlayer;
