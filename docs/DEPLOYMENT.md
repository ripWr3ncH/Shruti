# Deploying Shruti

Shruti deploys as two pieces, because the two halves have opposite needs.

| Piece | Host | Why |
| --- | --- | --- |
| `client/` — static React bundle | Vercel | Pure static output; a CDN is the right shape. |
| `server/` — Express pipeline | Azure VM | Spawns `ffmpeg` and `yt-dlp`, holds jobs in memory for minutes, writes a disk cache. Needs a real, always-on machine. |

The server **cannot** run on Vercel, Netlify, or any serverless platform. Four
independent blockers: external binaries it shells out to, an in-process job
registry that assumes one long-lived process, per-video work measured in
minutes against a 60–300 s function ceiling, and a writable `.cache/`.

---

## Part 1 — Client on Vercel

Already done. Configuration lives in [`vercel.json`](../vercel.json); the build
runs `npm run build` at the repo root and publishes `client/dist`.

To redeploy after changes:

```bash
vercel --prod
```

The client needs one environment variable, and only once the server is up —
see [step 9](#9-point-the-client-at-the-server) below.

> **Never put `GEMMA_API_KEY` in a `VITE_` variable.** Vite inlines anything
> prefixed `VITE_` into the public JavaScript bundle, where any visitor can
> read it. The Gemma key belongs on the server alone.

---

## Part 2 — Server on an Azure VM

### 1. Create the VM

In the Azure Portal: **Virtual machines → Create → Azure virtual machine**.

| Setting | Value | Notes |
| --- | --- | --- |
| Image | Ubuntu Server 24.04 LTS | |
| Size | **B2s** (2 vCPU, 4 GB) | B1s is too small — ffmpeg frame extraction will thrash. |
| Authentication | SSH public key | |
| Public inbound ports | SSH (22), HTTP (80), HTTPS (443) | |
| Disk | 32 GB Premium SSD | The cache holds downloaded audio and frames. |

On the **Management** tab, leave auto-shutdown off unless you want the API to
go down nightly.

### 2. Give it a DNS name

This is required, not cosmetic — a browser on an HTTPS Vercel page refuses to
call a plain `http://` or bare-IP API (mixed content). You need a hostname to
put a certificate on.

The free option: on the VM's **Overview** page click the **DNS name** →
*Configure* → set a label. You get
`your-label.<region>.cloudapp.azure.com`, which Let's Encrypt will happily
certify. A custom domain pointed at the VM's public IP works too.

Set the public IP to **Static** on that same page, so a reboot doesn't
invalidate your DNS and certificate.

### 3. Connect and install prerequisites

```bash
ssh azureuser@your-label.eastus.cloudapp.azure.com

sudo apt update && sudo apt upgrade -y
sudo apt install -y ffmpeg nginx git python3-pip

# Node 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# yt-dlp — install from pip, not apt; the apt build is old enough that
# YouTube extraction breaks.
sudo pip3 install --break-system-packages -U yt-dlp

# Deno — yt-dlp needs a JS runtime to solve YouTube's signature challenges.
# Without one, every format resolution fails with "Requested format is not
# available", even on a residential connection. Ubuntu's apt has no deno
# package, so fetch the release binary directly.
cd /tmp
curl -fsSL -o deno.zip https://github.com/denoland/deno/releases/latest/download/deno-x86_64-unknown-linux-gnu.zip
unzip -o -q deno.zip && sudo mv deno /usr/local/bin/deno && sudo chmod +x /usr/local/bin/deno
rm -f deno.zip
cd ~

node -v && ffmpeg -version | head -1 && yt-dlp --version && deno --version
```

### 4. Get the code

```bash
sudo mkdir -p /opt/shruti && sudo chown $USER:$USER /opt/shruti
git clone <your-repo-url> /opt/shruti
cd /opt/shruti
npm install --omit=dev --workspace server
```

### 5. Configure

```bash
nano /opt/shruti/.env
```

```ini
GEMMA_API_KEY=your_real_key_here
PORT=5174
LOG_LEVEL=info
CACHE_DIR=/opt/shruti/.cache
# The client's origin. Must match exactly — no trailing slash.
CORS_ORIGIN=https://your-app.vercel.app
```

Lock it down, then confirm the machine has everything the pipeline needs:

```bash
chmod 600 /opt/shruti/.env
npm run doctor
```

`doctor` checks Node, ffmpeg, yt-dlp and Gemma reachability. Fix anything it
reports before continuing.

### 6. Run it as a service

```bash
sudo nano /etc/systemd/system/shruti.service
```

```ini
[Unit]
Description=Shruti API
After=network.target

[Service]
Type=simple
User=azureuser
WorkingDirectory=/opt/shruti
ExecStart=/usr/bin/node server/src/index.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now shruti
sudo systemctl status shruti --no-pager
curl localhost:5174/health
```

### 7. Reverse proxy

```bash
sudo nano /etc/nginx/sites-available/shruti
```

```nginx
server {
    listen 80;
    server_name your-label.eastus.cloudapp.azure.com;

    client_max_body_size 25M;   # voice-search audio uploads

    location / {
        proxy_pass         http://127.0.0.1:5174;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;

        # Processing a video takes minutes; don't cut the connection.
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/shruti /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

### 8. TLS

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-label.eastus.cloudapp.azure.com --agree-tos -m you@example.com --redirect
```

Certbot rewrites the nginx config for 443 and installs a renewal timer. Verify:

```bash
curl https://your-label.eastus.cloudapp.azure.com/health
```

### 9. Point the client at the server

```bash
# from your local repo
vercel env add VITE_API_BASE production
# paste: https://your-label.eastus.cloudapp.azure.com

vercel --prod
```

`VITE_API_BASE` is read at **build** time, so the redeploy is what actually
applies it. Open the site, submit a video, and confirm requests in the browser
Network tab go to the Azure hostname and return 200.

---

## Two things likely to bite you on a cloud host

**1. YouTube throttles and challenges requests from datacenter IP ranges.**
`yt-dlp` may return *"Sign in to confirm you're not a bot"* where it worked
fine on your laptop. Fix: give yt-dlp browser cookies from a logged-in
session. Export `cookies.txt` from a browser (a **throwaway Google account**,
not your own — this file is a live session credential), copy it to the VM,
`chmod 600` it, and set `YTDLP_COOKIES_PATH` in `.env` to its path. Never
commit it — it's already covered by `.gitignore`.

**2. Format resolution fails outright without a JS runtime.** Independent of
the cookie issue — current YouTube requires solving a JS signature challenge
before it will hand back format URLs at all. Without Deno (or Node ≥22)
installed, every metadata, download, and subtitle call fails with *"Requested
format is not available"*, even from a residential IP. Step 3 above installs
Deno; the code passes `--remote-components ejs:github` on every yt-dlp
invocation so it can fetch its solver script (cached after the first run).

If the demo has to be reliable — a judged submission, a live presentation —
pre-process the videos you'll show while the cache directory persists.

## Operating notes

- **Logs**: `sudo journalctl -u shruti -f`
- **Deploy an update**: `git pull && npm install --omit=dev --workspace server && sudo systemctl restart shruti`
- **Cache growth**: `.cache/` accumulates audio and frames. Watch it with
  `du -sh /opt/shruti/.cache` and clear it when disk gets tight.
- **Restarts drop jobs**: the job registry is in memory, so a restart loses
  in-flight processing. Completed timelines survive in the disk cache.
- **Cost**: a B2s running continuously is roughly $30–40/month. Deallocate it
  from the portal when idle — stopping from inside the VM still bills you.
