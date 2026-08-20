import { useMemo, useState } from 'react';
import { formatTime } from '../lib/format.js';
import Icon from './Icon.jsx';
import { useI18n, spokenTime } from '../i18n/index.jsx';

/** Below this many descriptions, a filter box is more clutter than help. */
const FILTER_THRESHOLD = 6;

/**
 * Every description Shruti prepared, as a navigable list.
 *
 * This doubles as the transparency surface: a learner can review exactly what
 * the AI will say and when, and jump to any of it.
 *
 * Two things make it usable on a long lecture rather than just honest. A filter
 * turns the list into a way to *find* a moment — "the part about gradients" —
 * which for a blind learner replaces scrubbing a timeline by eye. And the
 * export buttons let the timeline leave the browser: it costs minutes of
 * processing and a run of Gemma calls to produce, and until now it only existed
 * in one tab.
 */
export function DescriptionTimeline({ descriptions, currentTime, onJump, stats, onExport }) {
  const { t } = useI18n();
  const [filter, setFilter] = useState('');

  const query = filter.trim().toLowerCase();
  const visible = useMemo(() => {
    if (!query) return descriptions;
    return descriptions.filter(
      (entry) =>
        entry.description.toLowerCase().includes(query) ||
        formatTime(entry.time).includes(query),
    );
  }, [descriptions, query]);

  if (!descriptions.length) {
    return (
      <section className="panel timeline" aria-labelledby="timeline-heading">
        <h2 id="timeline-heading">{t('timeline.heading')}</h2>
        <div className="timeline-empty">
          <img src="/logo.svg" alt="" />
          <p>{t('timeline.empty')}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="panel timeline" aria-labelledby="timeline-heading">
      <div className="panel-title-row">
        <h2 id="timeline-heading">
          {t('timeline.headingCount', { count: descriptions.length })}
        </h2>
        {stats && (
          <p className="timeline-stat">
            {t('timeline.stat', { accepted: stats.accepted, candidates: stats.candidates })}
            {stats.explanations > 0
              ? t('timeline.statExplanations', { count: stats.explanations })
              : ''}
          </p>
        )}
      </div>

      <div className="timeline-tools">
        {descriptions.length >= FILTER_THRESHOLD && (
          <div className="timeline-filter">
            <label htmlFor="timeline-filter">{t('timeline.filterLabel')}</label>
            <input
              id="timeline-filter"
              type="text"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder={t('timeline.filterPlaceholder')}
              autoComplete="off"
            />
          </div>
        )}

        {onExport && (
          <div className="timeline-export" role="group" aria-label={t('timeline.exportGroup')}>
            <button type="button" className="secondary" onClick={() => onExport('text')}>
              <Icon name="external" size={16} />
              {t('timeline.exportText')}
            </button>
            <button type="button" className="secondary" onClick={() => onExport('vtt')}>
              <Icon name="external" size={16} />
              {t('timeline.exportVtt')}
            </button>
          </div>
        )}
      </div>

      {/* The match count is a live region: filtering is a silent visual change
          otherwise, and someone typing here cannot see the list shrink. */}
      {query !== '' && (
        <p className="timeline-filter-count" role="status">
          {visible.length === 0
            ? t('timeline.filterNone', { query: filter.trim() })
            : t('timeline.filterCount', { count: visible.length })}
        </p>
      )}

      <ol className="description-list">
        {visible.map((entry) => {
          const isCurrent = currentTime >= entry.time && currentTime < entry.time + 4;
          const isExplain = entry.mode === 'explain';
          const delivery = isExplain
            ? t('timeline.deliveryExplain')
            : entry.requiresPause
              ? t('timeline.deliveryPause')
              : t('timeline.deliveryNatural');
          return (
            <li
              key={entry.time}
              className={
                [isCurrent ? 'current' : '', isExplain ? 'explain' : ''].filter(Boolean).join(' ') ||
                undefined
              }
            >
              <button
                type="button"
                onClick={() => onJump(entry)}
                aria-label={t('timeline.itemLabel', {
                  time: spokenTime(entry.time, t),
                  description: entry.description,
                  confidence: Math.round(entry.confidence * 100),
                  delivery,
                })}
              >
                <span className="d-stamp" aria-hidden="true">
                  <Icon name="play" size={14} />
                  {formatTime(entry.time)}
                </span>
                <span className="d-text" aria-hidden="true">
                  {entry.description}
                </span>
                <span className="d-tags" aria-hidden="true">
                  {isExplain ? (
                    <span className="tag explain">{t('timeline.tagExplain')}</span>
                  ) : entry.requiresPause ? (
                    <span className="tag pause">{t('timeline.tagPause')}</span>
                  ) : (
                    <span className="tag">{t('timeline.tagBrief')}</span>
                  )}
                  <span className="d-confidence">{Math.round(entry.confidence * 100)}%</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export default DescriptionTimeline;
