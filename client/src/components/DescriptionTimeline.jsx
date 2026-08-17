import { formatTime } from '../lib/format.js';
import Icon from './Icon.jsx';
import { useI18n, spokenTime } from '../i18n/index.jsx';

/**
 * Every description Shruti prepared, as a navigable list.
 *
 * This doubles as the transparency surface: a learner can review exactly what
 * the AI will say and when, and jump to any of it.
 */
export function DescriptionTimeline({ descriptions, currentTime, onJump, stats }) {
  const { t } = useI18n();

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

      <ol className="description-list">
        {descriptions.map((entry) => {
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
