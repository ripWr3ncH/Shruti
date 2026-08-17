/**
 * Screen-reader announcements.
 *
 * Every state change a sighted user would *see* has to be *heard*: processing
 * progress, playback state, errors, and what Shruti just said.
 */
import { useCallback, useRef, useState } from 'react';

export function useAnnouncer() {
  const [polite, setPolite] = useState('');
  const [assertive, setAssertive] = useState('');
  const counterRef = useRef(0);

  /**
   * @param {string} message
   * @param {{assertive?:boolean}} [options] assertive interrupts the reader
   */
  const announce = useCallback((message, { assertive: urgent = false } = {}) => {
    const text = String(message || '').trim();
    if (!text) return;
    // A repeated identical string is not re-announced by most screen readers;
    // an invisible counter forces the live region to change.
    counterRef.current += 1;
    const payload = counterRef.current % 2 === 0 ? text : `${text}​`;
    if (urgent) setAssertive(payload);
    else setPolite(payload);
  }, []);

  const clear = useCallback(() => {
    setPolite('');
    setAssertive('');
  }, []);

  return { polite, assertive, announce, clear };
}

export default useAnnouncer;
