# Routing yt-dlp through a residential connection

## Why cookies kept expiring

The VM's IP is an Azure datacenter range. YouTube's bot-check is a judgement
about **the IP**, not the session — which is why a `cookies.txt` exported from
a perfectly healthy browser still dies within days once it is used from the
VM. Google sees a datacenter address replaying a consumer session and revokes
it. Rotating a pool of accounts
([`cookiePool.js`](../server/src/lib/cookiePool.js)) buys time but never
converges: every cookie in the pool is on the same decay clock, and each one
has to be replaced by hand.

Measured on the same day, same yt-dlp version, same videos:

| Egress | Cookies needed | Outcome |
|---|---|---|
| Laptop (residential) | none at all | zero failures |
| VM (Azure datacenter) | required | bot-checked, cookie dead in ~3 days |

So the durable fix is to stop trying to authenticate the request and change
where it comes from instead. With residential egress, **no cookies are needed
at all** — which is exactly what a laptop already demonstrates.

## What this costs to run

Almost nothing, because of two properties the app already has:

- Playback is the **YouTube iframe** — video streams from YouTube's CDN
  straight to the viewer, never through here.
- Interactive Q&A extracts frames with `ffmpeg` from the **already-downloaded**
  file on disk.

yt-dlp therefore runs **once per video, ever**, and `MAX_VIDEO_HEIGHT=480`
keeps that download to ~20 MB. Nothing streams through the tunnel.

## Topology

The laptop is behind NAT and has no public IP, so it dials **out** to the VM
and the VM uses the resulting tunnel as a SOCKS proxy:

```
VM: yt-dlp --proxy socks5://127.0.0.1:1080
      │
      └── reverse SSH tunnel (laptop dialled out) ──► laptop ──► YouTube
                                                    (residential IP)
```

A reverse SSH tunnel is used rather than WireGuard deliberately: WireGuard
needs IP forwarding plus NAT on the laptop and policy routing on the VM, and a
routing mistake on a remote VM can lock you out of SSH. This touches nothing
but yt-dlp's arguments.

`GatewayPorts` is `no` on the VM, so port 1080 binds to VM-localhost only — it
is not reachable from the internet. That is what we want: the only consumer is
the app running on the same host.

## Setup

### 1. On the VM — point yt-dlp at the tunnel

```bash
# /opt/shruti/.env
YTDLP_PROXY=socks5://127.0.0.1:1080
```

Then `sudo systemctl restart shruti`.

Cookies can be left configured as a fallback for when the tunnel is down, or
removed entirely — with the tunnel up they are not consulted, because nothing
fails in a way that triggers rotation.

### 2. On the laptop — open the tunnel

```bash
ssh -N -R 1080 \
  -i your_key.pem \
  -o ExitOnForwardFailure=yes \
  -o ServerAliveInterval=30 \
  -o ServerAliveCountMax=3 \
  azureuser@your-label.<region>.cloudapp.azure.com
```

`-R 1080` (no destination) is OpenSSH's **remote dynamic forward**: it opens a
SOCKS5 listener on the VM that exits via this machine. Needs OpenSSH ≥ 7.6 on
the client. `ServerAlive*` reconnects a tunnel dropped by a laptop sleeping or
changing network.

### 3. Keep it up across reboots and sleep

The one-liner above dies when the laptop sleeps. To make it durable, wrap it
in a retry loop and register it as a scheduled task that runs at logon:

```powershell
# save as tunnel.ps1
while ($true) {
  ssh -N -R 1080 -i D:\Shruti\your_key.pem `
    -o ExitOnForwardFailure=yes -o ServerAliveInterval=30 `
    -o ServerAliveCountMax=3 -o StrictHostKeyChecking=accept-new `
    azureuser@your-label.<region>.cloudapp.azure.com
  Start-Sleep -Seconds 10   # reconnect after a drop
}
```

```powershell
schtasks /create /tn ShrutiTunnel /sc onlogon /rl highest `
  /tr "powershell -WindowStyle Hidden -ExecutionPolicy Bypass -File D:\Shruti\tunnel.ps1"
```

## Verifying

```bash
# on the VM — should print the *laptop's* IP, not the Azure one
curl -s --socks5-hostname 127.0.0.1:1080 https://api.ipify.org

# and yt-dlp with no cookies at all should now resolve
yt-dlp --proxy socks5://127.0.0.1:1080 --remote-components ejs:github \
  --skip-download --print "%(title)s" "https://www.youtube.com/watch?v=VIDEO_ID"
```

## What happens when the laptop is off

Only **un-cached** videos are affected — they fail with the usual bot-check
error, exactly as they did before this was set up. Nothing regresses.

Every already-processed video keeps working, permanently and with no laptop
involved, because its cache files live on the VM and playback never touches
yt-dlp. That is the same property described in
[`LOCAL_PREPROCESSING.md`](LOCAL_PREPROCESSING.md), and the two approaches are
complementary: pre-processing covers the videos you know about, the tunnel
covers the ones you don't.

For a deployment that must tolerate the laptop being off, swap the tunnel for a
paid residential proxy — same `YTDLP_PROXY` setting, no other change. At
~20 MB per video, one-time, that is a few cents per video.
