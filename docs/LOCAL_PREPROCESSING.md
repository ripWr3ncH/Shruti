# Pre-processing videos locally and syncing to the VM

## The problem this solves

The Azure VM's IP is a datacenter range, which YouTube treats with far more
suspicion than a residential connection. Two independent consequences:

1. **Bot-check.** yt-dlp fails with *"Sign in to confirm you're not a bot"*
   unless it's given cookies from a logged-in session — and that session's
   real lifetime is set by Google's abuse detection, not the expiry the
   cookie file claims. On this VM a fresh cookie export died in about 3 days.
2. Even with a live cookie, format resolution needs a JS challenge solved
   (see [`DEPLOYMENT.md`](DEPLOYMENT.md)) — a second, independent failure mode.

`YTDLP_COOKIES_DIR` (a rotating pool of cookies from separate Google
accounts, see [`server/src/lib/cookiePool.js`](../server/src/lib/cookiePool.js))
reduces how often this bites, but doesn't eliminate it — it still needs a
human to periodically add a fresh account to the pool.

## The actual fix: don't run yt-dlp on the VM at all, for videos you control

This isn't a workaround, it's a consequence of the app's real architecture:

- **Playback never uses the downloaded video file.** Shruti embeds the
  **YouTube iframe player** — video streams straight from YouTube's own CDN
  into the viewer's browser. yt-dlp is only used **once**, server-side,
  during initial processing, to get pixels for Gemma to look at.
- **Interactive Q&A doesn't call yt-dlp either.** Asking about the current
  frame extracts it with `ffmpeg` from the *already-downloaded* video file on
  disk — no network call to YouTube involved.

So once a video has been fully processed and its cache files exist on the
server, that video is **permanently independent of yt-dlp** — not fragile,
not time-limited. The only thing that still needs live yt-dlp on the VM is a
video nobody has pre-processed yet (e.g. a judge pasting an arbitrary URL).

The plan: process the videos you control (demo videos, case-study videos)
**on a laptop**, where yt-dlp works cleanly against a residential IP with no
cookies needed at all, then copy the resulting cache files onto the VM.

## What gets copied

Per video id, from the local `.cache/` into the same relative path under
`/opt/shruti/.cache/` on the VM:

| Path | What it is | Required? |
|---|---|---|
| `videos/<id>.*` | The downloaded video file | Yes — needed for Q&A frame extraction |
| `data/<id>.info.json` | Video metadata | Yes |
| `data/<id>.transcript.json` | Captions | Yes |
| `data/<id>.comprehension.json` | Gemma's one-time lesson understanding | Yes |
| `data/<id>.timeline.<hash>.json` | The generated descriptions | Yes — this is the actual payoff |
| `frames/<id>/` | Pre-extracted JPEGs for each described moment | Optional — minor optimization only |

No server restart is needed after copying; the cache is read from disk on
every request.

## Required configuration

### Laptop

- **yt-dlp**: `pip install -U yt-dlp` (not pre-installed on Windows by
  default). Confirmed working with zero bot-check and full format
  resolution from a residential IP, no cookies, no `--remote-components`
  flag needed.
- **ffmpeg / ffprobe**: on PATH.
- **`.env`** at the repo root with a real `GEMMA_API_KEY` (already present
  locally in this project).

### Compatibility requirement between laptop and VM

The timeline filename is a hash of the pipeline settings:

```
GEMMA_MODEL, MIN_GAP_SECONDS, MIN_SPACING_SECONDS,
FORCED_CANDIDATE_INTERVAL, MAX_CANDIDATES,
CONFIDENCE_HIGH, CONFIDENCE_CRITICAL
```

If the laptop's `.env` and the VM's `.env` disagree on any of these, the
server computes a different hash and won't recognise the synced timeline as
a cache hit (it would just regenerate it via Gemma — not a hard failure,
but it defeats the point). As of this writing both files already match,
since the VM's `.env` was copied from this same local file during initial
deployment. Worth re-checking if either file is edited later.

### VM

No configuration changes — it already reads from `.cache/` in the paths
above.

## Steps

1. **Start the app locally**, using the existing `.env`:
   ```bash
   npm run dev          # server + client, or
   npm run start --workspace server   # server only, for API-driven processing
   ```
2. **Process each video** — either through the browser UI (paste the URL,
   let it run) or by driving the API directly:
   ```bash
   curl -X POST http://localhost:5174/api/process \
     -H "Content-Type: application/json" \
     -d '{"url":"https://www.youtube.com/watch?v=VIDEO_ID"}'
   # -> { "jobId": "..." }
   curl http://localhost:5174/api/process/JOB_ID   # poll until status is "done"
   ```
3. **Find the cache files** for that video id under `.cache/videos/`,
   `.cache/data/`, and `.cache/frames/` in the repo root.
4. **Copy them to the VM** — see the SSH section below for connecting, then:
   ```bash
   scp -i your_key.pem .cache/videos/VIDEO_ID.* \
     azureuser@your-label.<region>.cloudapp.azure.com:/opt/shruti/.cache/videos/

   scp -i your_key.pem \
     .cache/data/VIDEO_ID.info.json \
     .cache/data/VIDEO_ID.transcript.json \
     .cache/data/VIDEO_ID.comprehension.json \
     .cache/data/VIDEO_ID.timeline.*.json \
     azureuser@your-label.<region>.cloudapp.azure.com:/opt/shruti/.cache/data/
   ```
5. **Verify** — load the video on the live deployed app
   (https://your-app.vercel.app) and confirm it plays with
   descriptions immediately, with no yt-dlp call on the critical path. You
   can also check `/api/video/info?url=...` on the API directly for an
   instant response.

## Connecting to the VM

Connection details:

- **Host**: `your-label.<region>.cloudapp.azure.com`
- **User**: `shruti`
- **Key**: `your_key.pem` (repo root — **gitignored**, never commit it)

```bash
ssh -i your_key.pem azureuser@your-label.<region>.cloudapp.azure.com
```

If SSH ever stops working (wrong key, lost key, permission denied), the
recovery path that doesn't depend on the old key at all is Azure Cloud
Shell + `az vm user update`:

```bash
# in Azure Cloud Shell (browser, already authenticated to the subscription)
az vm list -d -o table   # confirm resource group + VM name

az vm user update \
  --resource-group SHRUTI_GROUP \
  --name shruti \
  --username shruti \
  --ssh-key-value "$(cat path/to/new_key.pub)"
```

This registers a public key on the VM through Azure's control plane,
bypassing SSH entirely — no working key or password required beforehand.

### Useful VM commands while doing this

```bash
# service status / logs
sudo systemctl status shruti --no-pager
sudo journalctl -u shruti -f

# disk usage — plenty of headroom (25GB free of 29GB as of this writing)
df -h /
du -sh /opt/shruti/.cache/*

# restart after any .env or code change
cd /opt/shruti && git pull -q && sudo systemctl restart shruti
```

## Storage

Not a real constraint at this scale. `MAX_VIDEO_HEIGHT=480` keeps downloads
small (an 18-minute video was 18.6 MB); even a few dozen pre-cached demo
videos stay well under 1 GB. The VM has 25 GB free; the laptop has tens of
GB free. No cleanup or quota configuration needed.

## Limitation

This only covers videos that have actually been pre-processed. Someone
pasting a URL nobody has run yet still hits live yt-dlp on the VM and can
still fail with the bot-check error (unless a working cookie exists in the
pool at that moment). If you are demonstrating a known set of videos, that
is usually the realistic usage pattern — but pre-process a slightly wider
set than the bare minimum, in case someone tries something adjacent.
