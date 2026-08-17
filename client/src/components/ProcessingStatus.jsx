import { useI18n } from '../i18n/index.jsx';

/**
 * Progress while the timeline is being generated.
 *
 * The progress bar is a real ARIA progressbar, and the same information is
 * repeated as text, so it is legible whether the learner is reading, listening,
 * or both.
 */
export function ProcessingStatus({ job, videoTitle, onCancel }) {
  const { t } = useI18n();
  const percent = Math.max(0, Math.min(100, job?.percent ?? 0));

  // Stage names come from the server as machine-readable keys, so they can be
  // translated here. The accompanying `job.message` is server prose and stays
  // in English for now — the pipeline does not know the interface language.
  const stageLabel = job?.stage ? t(`processing.stage.${job.stage}`) : null;
  const stageText =
    stageLabel && stageLabel !== `processing.stage.${job.stage}`
      ? stageLabel
      : t('processing.working');

  return (
    <section className="panel processing" aria-labelledby="processing-heading">
      <h2 id="processing-heading">{t('processing.heading')}</h2>
      {videoTitle && <p className="video-title">{videoTitle}</p>}

      <div
        className="progress"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={t('announce.progress', { percent, message: job?.message || '' })}
        aria-labelledby="processing-heading"
      >
        <div className="progress-fill" style={{ width: `${percent}%` }} />
      </div>

      <p className="processing-stage">
        <strong>{stageText}</strong> — {percent}%
      </p>
      <p className="processing-message">{job?.message}</p>

      <button type="button" onClick={onCancel} className="secondary">
        {t('processing.cancel')}
      </button>
    </section>
  );
}

export default ProcessingStatus;
