import { forwardRef } from 'react';
import { formatTime } from '../lib/format.js';
import Icon from './Icon.jsx';
import { useI18n, spokenTime } from '../i18n/index.jsx';

/**
 * The video and its transport controls.
 *
 * Every control is a real button or a real range input: native semantics,
 * native keyboard behaviour, no custom widget to get wrong. The YouTube iframe
 * itself is removed from the tab order (`disablekb` plus a wrapper) so focus
 * never disappears into a player a blind user cannot navigate. Icons are
 * decorative; each control keeps its full text label.
 */
export const PlayerPanel = forwardRef(function PlayerPanel(
  {
    containerRef,
    title,
    language,
    currentTime,
    duration,
    isPlaying,
    descriptionsEnabled,
    descriptionCount,
    muted,
    onPlayPause,
    onSeek,
    onSeekBy,
    onToggleDescriptions,
    onToggleMute,
    onRepeat,
    onSkip,
    speaking,
  },
  playButtonRef,
) {
  const { t } = useI18n();
  const position = t('player.positionOf', {
    current: formatTime(currentTime),
    total: formatTime(duration),
  });

  return (
    <section className="panel player" aria-labelledby="player-heading">
      <div className="panel-title-row">
        <h2 id="player-heading">{title || t('player.video')}</h2>
        {language && (
          <span className="lang-badge">
            <Icon name="language" size={16} />
            {language.native || language.name}
          </span>
        )}
      </div>

      {/* aria-hidden: the iframe carries no information a blind user can use;
          everything meaningful is exposed through the controls below. */}
      <div className="video-frame" aria-hidden="true">
        <div ref={containerRef} />
      </div>

      <div className="transport" role="group" aria-label={t('player.controls')}>
        <button
          type="button"
          ref={playButtonRef}
          className="primary transport-btn"
          onClick={onPlayPause}
          aria-keyshortcuts="Space K"
        >
          <Icon name={isPlaying ? 'pause' : 'play'} size={22} />
          <span className="t-label">{isPlaying ? t('player.pause') : t('player.play')}</span>
        </button>

        <button type="button" className="transport-btn" onClick={() => onSeekBy(-10)} aria-keyshortcuts="J">
          <Icon name="back" size={22} />
          <span className="t-label">{t('player.back10')}</span>
        </button>

        <button type="button" className="transport-btn" onClick={() => onSeekBy(10)} aria-keyshortcuts="L">
          <Icon name="forward" size={22} />
          <span className="t-label">{t('player.forward10')}</span>
        </button>

        <button
          type="button"
          className="transport-btn"
          onClick={onToggleMute}
          aria-pressed={muted}
          aria-keyshortcuts="M"
        >
          <Icon name={muted ? 'mute' : 'sound'} size={22} />
          <span className="t-label">{muted ? t('player.unmute') : t('player.mute')}</span>
        </button>

        <button
          type="button"
          className="transport-btn"
          onClick={onToggleDescriptions}
          aria-pressed={descriptionsEnabled}
          aria-keyshortcuts="D"
        >
          <Icon name="descriptions" size={22} />
          <span className="t-label">
            {descriptionsEnabled ? t('player.descriptionsOn') : t('player.descriptionsOff')}
          </span>
        </button>

        <button
          type="button"
          className="transport-btn"
          onClick={onSkip}
          aria-keyshortcuts="S"
          disabled={!speaking}
        >
          <Icon name="skip" size={22} />
          <span className="t-label">{t('player.skipSpeech')}</span>
        </button>

        <button type="button" className="transport-btn" onClick={onRepeat} aria-keyshortcuts="R">
          <Icon name="replay" size={22} />
          <span className="t-label">{t('player.replayLast')}</span>
        </button>
      </div>

      {/* A live, non-intrusive banner while Shruti is talking, so the
          learner always knows the skip and replay keys are available. */}
      {speaking && (
        <p className="speaking-banner" aria-hidden="true">
          <img src="/logo.svg" alt="" />
          <span>{t('player.speakingBanner', { skip: 'S', replay: 'R' })}</span>
          <span className="speaking-wave" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
          </span>
        </p>
      )}

      <div className="seek">
        <label htmlFor="seek-slider">{t('player.seekLabel')}</label>
        <div className="seek-row">
          <input
            id="seek-slider"
            type="range"
            min={0}
            max={Math.max(1, Math.floor(duration))}
            step={1}
            value={Math.min(Math.floor(currentTime), Math.max(1, Math.floor(duration)))}
            onChange={(event) => onSeek(Number(event.target.value))}
            aria-valuetext={spokenTime(currentTime, t)}
          />
          <p className="position" aria-hidden="true">
            {position}
          </p>
        </div>
        <p className="sr-only" aria-live="off">
          {position}
        </p>
      </div>
    </section>
  );
});

export default PlayerPanel;
