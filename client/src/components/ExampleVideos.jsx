import { useEffect, useState } from 'react';
import Icon from './Icon.jsx';
import { api } from '../lib/api.js';
import { formatTime } from '../lib/format.js';
import { useI18n } from '../i18n/index.jsx';

/**
 * Videos this server has already processed, offered as one-click examples.
 *
 * Worth the space because these are the only videos guaranteed to open: they
 * are served entirely from cache, with no yt-dlp call, so they work even when
 * YouTube is bot-checking the server's IP. Pasting an arbitrary link can still
 * fail on a cloud host; picking one of these cannot.
 *
 * The list renders nothing at all until it has something to show — an empty or
 * unreachable library is not an error worth putting in front of a learner, who
 * can always paste a link instead.
 */
export function ExampleVideos({ onPick, busy }) {
  const [videos, setVideos] = useState([]);
  const { t } = useI18n();

  useEffect(() => {
    let cancelled = false;
    api
      .readyVideos()
      .then((data) => {
        if (!cancelled) setVideos(data?.videos || []);
      })
      .catch(() => {
        /* the URL form is the primary path; stay quiet and out of the way */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (videos.length === 0) return null;

  return (
    <section className="panel example-videos" aria-labelledby="examples-heading">
      <h2 id="examples-heading">{t('examples.heading')}</h2>
      <p className="help" id="examples-help">
        {videos.length === 1
          ? t('examples.helpOne')
          : t('examples.helpMany', { count: videos.length })}
      </p>

      <ul className="search-results" aria-describedby="examples-help">
        {videos.map((video) => (
          <li key={video.videoId}>
            <button
              type="button"
              disabled={busy}
              onClick={() => onPick(video.url)}
              aria-label={t('examples.itemLabel', {
                title: video.title,
                channel: video.channel ? t('examples.byChannel', { channel: video.channel }) : '',
                duration: video.duration ? `, ${formatTime(video.duration)}` : '',
                descriptions: video.descriptions
                  ? t('examples.descriptionCount', { count: video.descriptions })
                  : '',
              })}
            >
              <img src={video.thumbnail} alt="" loading="lazy" />
              <span className="result-body">
                <span className="result-title">{video.title}</span>
                <span className="result-meta" aria-hidden="true">
                  {video.channel}
                  {video.channel && video.duration ? ' · ' : ''}
                  {video.duration ? formatTime(video.duration) : ''}
                  {video.descriptions
                    ? ` · ${t('examples.descriptionsShort', { count: video.descriptions })}`
                    : ''}
                </span>
              </span>
              <Icon name="play" size={18} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default ExampleVideos;
