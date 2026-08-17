/**
 * The two ARIA live regions every announcement flows through.
 * Visually hidden, but they are the application's primary output for a
 * screen-reader user, so they are mounted for the whole session.
 */
export function LiveRegions({ polite, assertive }) {
  return (
    <>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {polite}
      </div>
      <div className="sr-only" role="alert" aria-live="assertive" aria-atomic="true">
        {assertive}
      </div>
    </>
  );
}

export default LiveRegions;
