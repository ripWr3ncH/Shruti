import Icon from './Icon.jsx';
import LanguageSwitch from './LanguageSwitch.jsx';
import { useI18n } from '../i18n/index.jsx';

/**
 * Speech and display preferences.
 *
 * Adjustable speech speed and a high-contrast mode are explicit requirements,
 * not extras.
 *
 * The language switch appears here as well as in the header: the header is
 * where it is found by someone looking at the page, and this is where it is
 * found by someone working through the settings with a screen reader.
 */
export function SettingsPanel({
  settings,
  update,
  voices,
  onTestVoice,
  language,
  voiceAvailable,
  onLanguageChange,
}) {
  const { t } = useI18n();
  const nonEnglish = language && !language.isEnglish;

  return (
    <section className="panel settings" aria-labelledby="settings-heading">
      <h2 id="settings-heading">{t('settings.heading')}</h2>

      <div className="field">
        <span className="field-label">{t('app.languageLabel')}</span>
        <LanguageSwitch onChange={onLanguageChange} />
        <p className="field-note-plain">{t('settings.descriptionLanguageHelp')}</p>
      </div>

      <div className="field">
        <label htmlFor="speech-rate">
          {t('settings.speechSpeed')}{' '}
          <span className="field-value">{settings.rate.toFixed(2)}x</span>
        </label>
        <input
          id="speech-rate"
          type="range"
          min={0.5}
          max={2.5}
          step={0.1}
          value={settings.rate}
          onChange={(event) => update({ rate: Number(event.target.value) })}
          aria-valuetext={t('settings.speechSpeedValue', { rate: settings.rate.toFixed(1) })}
          aria-keyshortcuts="Comma Period"
        />
        <div className="slider-scale" aria-hidden="true">
          <span>0.5x</span>
          <span>{t('settings.normal')}</span>
          <span>2.5x</span>
        </div>
      </div>

      <div className="field">
        <label htmlFor="speech-volume">
          {t('settings.volume')}{' '}
          <span className="field-value">{Math.round(settings.volume * 100)}%</span>
        </label>
        <input
          id="speech-volume"
          type="range"
          min={0.1}
          max={1}
          step={0.05}
          value={settings.volume}
          onChange={(event) => update({ volume: Number(event.target.value) })}
          aria-valuetext={t('settings.volumeValue', { percent: Math.round(settings.volume * 100) })}
        />
        <div className="slider-scale" aria-hidden="true">
          <span>10%</span>
          <span>100%</span>
        </div>
      </div>

      <div className="field">
        <label htmlFor="voice-select">
          {nonEnglish ? t('settings.voiceFor', { language: language.name }) : t('settings.voice')}
        </label>
        <select
          id="voice-select"
          value={settings.voiceURI}
          onChange={(event) => update({ voiceURI: event.target.value })}
        >
          <option value="">{t('settings.systemDefault')}</option>
          {voices.map((voice) => (
            <option key={voice.voiceURI} value={voice.voiceURI}>
              {voice.name} ({voice.lang})
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onTestVoice}
          className="secondary"
          style={{ marginTop: '0.6rem', width: '100%' }}
        >
          <Icon name="sound" size={18} />
          {t('settings.testVoice')}
        </button>
        {nonEnglish && !voiceAvailable && (
          <p className="field-note" role="note">
            <Icon name="alert" size={16} />
            <span>{t('settings.noVoiceNote', { language: language.name })}</span>
          </p>
        )}
      </div>

      <fieldset className="field">
        <legend>{t('settings.behaviour')}</legend>

        <label className="checkbox">
          <input
            type="checkbox"
            checked={settings.descriptionsEnabled}
            onChange={(event) => update({ descriptionsEnabled: event.target.checked })}
          />
          {t('settings.autoSpeak')}
        </label>

        <label className="checkbox">
          <input
            type="checkbox"
            checked={settings.duckVideo}
            onChange={(event) => update({ duckVideo: event.target.checked })}
          />
          {t('settings.duck')}
        </label>

        <label className="checkbox">
          <input
            type="checkbox"
            checked={settings.speakStatus}
            onChange={(event) => update({ speakStatus: event.target.checked })}
          />
          {t('settings.readStatus')}
        </label>

        <label className="checkbox">
          <input
            type="checkbox"
            checked={settings.highContrast}
            onChange={(event) => update({ highContrast: event.target.checked })}
          />
          {t('settings.highContrast')}
        </label>
      </fieldset>
    </section>
  );
}

export default SettingsPanel;
