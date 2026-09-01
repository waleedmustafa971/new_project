# Max Social deployment handoff

Last updated: 2026-08-29 (landing page + legal pages redesigned)

## What is live

| Address | Purpose | Target |
| --- | --- | --- |
| `https://maxsocialapp.com/` | Public landing page | Static page on the Ubuntu server |
| `https://maxsocialapp.com/policy` | Privacy Policy (app-store link) | Static page on the Ubuntu server |
| `https://maxsocialapp.com/terms_of_use` | Terms of Use (app-store link) | Static page on the Ubuntu server |
| `https://api.maxsocialapp.com/` | Node/Express API | Nginx proxy to `127.0.0.1:5000` |
| `https://admin.maxsocialapp.com/` | Admin dashboard | Redirects `/` to `/admin/`, then proxies to `127.0.0.1:5000` |
| `https://63-186-156-80.sslip.io/` | Previous API hostname | Still live for backwards compatibility |

All three `maxsocialapp.com` hostnames use HTTPS and redirect HTTP to HTTPS.

## AWS / Route 53

- Domain: `maxsocialapp.com`
- Hosted zone ID: `Z0157323X5O658BSW8IE`
- AWS CLI profile: `maxapp`
- The registration was completed on 2026-08-29. Auto-renew is enabled; the registration is expected to run through 2027-08-29.

Current public DNS records:

```text
maxsocialapp.com.       A  63.186.156.80
api.maxsocialapp.com.   A  63.186.156.80
admin.maxsocialapp.com. A  63.186.156.80
```

The Route 53 zone's authoritative nameservers are:

```text
ns-1688.awsdns-19.co.uk.
ns-736.awsdns-28.net.
ns-1301.awsdns-34.org.
ns-206.awsdns-25.com.
```

`www.maxsocialapp.com` is intentionally not configured.

## Server access

- Server IP: `63.186.156.80`
- OS account: `ubuntu`
- SSH key location on this Windows workstation: `C:\Users\Waleed\.ssh\maxapp-eu.pem`
- That account has passwordless `sudo`.

Example connection:

```powershell
& 'C:\Windows\System32\OpenSSH\ssh.exe' -i 'C:\Users\Waleed\.ssh\maxapp-eu.pem' ubuntu@63.186.156.80
```

Do not commit or paste the key. Windows OpenSSH requires restrictive permissions on private keys. If a temporary project copy is necessary, put it under `secrets/` (already ignored by Git), restrict it to the current user, and delete it when finished.

## Nginx layout

Nginx virtual-host files on the server:

```text
/etc/nginx/sites-available/maxapp                 # Existing sslip.io API host
/etc/nginx/sites-available/maxsocialapp-api       # api.maxsocialapp.com
/etc/nginx/sites-available/maxsocialapp           # Static public landing page
/etc/nginx/sites-available/maxsocialapp-admin     # Admin subdomain -> Node backend
```

Each is symlinked from `/etc/nginx/sites-enabled/`.

The Node backend is proxied at `http://127.0.0.1:5000`; its deployed files are under `/home/ubuntu/app/backend`. Do not replace the API/administrator Nginx sites with the static landing configuration.

The public static files are:

```text
/var/www/maxsocialapp/index.html                  # landing page
/var/www/maxsocialapp/policy/index.html           # served at /policy
/var/www/maxsocialapp/terms_of_use/index.html     # served at /terms_of_use
```

`/policy` and `/terms_of_use` are directories holding an `index.html`, so nginx serves them with the
stock `try_files $uri $uri/ =404` and **no config change was needed**. Requesting the extensionless
path returns a 301 to the trailing-slash form, then 200 - which Apple and Google both accept. If you
would rather they return 200 directly, flatten them to `policy.html` / `terms_of_use.html` and change
the `location /` block to `try_files $uri $uri.html $uri/ =404;`.

Its version-controlled source is [maxsocialapp-landing-page.html](maxsocialapp-landing-page.html). It was redesigned on 2026-08-29 as a responsive, iOS-inspired marketing page with a CSS-built mobile-app illustration; it has no external image, font, JavaScript, or build dependency.

The page represents the features confirmed in the codebase: posts, reels, stories, music, real-time messages, groups, voice/video calls, live experiences, notifications, privacy/safety controls, creator tools, and the AI reel assistant. It deliberately describes the product as a social-first experience and does not promise currently disabled modules as live features.

To change the live page, edit the versioned source file first and copy the finished HTML to `/var/www/maxsocialapp/index.html` over SSH. Then verify the public page with `curl -I https://maxsocialapp.com` (or use `--resolve maxsocialapp.com:443:63.186.156.80` if a local resolver has cached an older DNS answer). No Nginx reload is needed for a static HTML-only change.

## TLS / Certbot

Certbot is installed at `/usr/bin/certbot` and has automatic renewal enabled. Certificates currently exist for:

```text
63-186-156-80.sslip.io
api.maxsocialapp.com
maxsocialapp.com
admin.maxsocialapp.com
```

The three new domain certificates were issued on 2026-08-29 and expire on 2026-11-27; Certbot renews them automatically.

Useful safe checks:

```bash
sudo certbot certificates
sudo nginx -t
sudo systemctl reload nginx
```

For a new hostname: create the Route 53 record first, wait until it is `INSYNC`, add an HTTP Nginx server block for that hostname, run `sudo certbot certonly --nginx -d <hostname> --non-interactive --agree-tos --keep-until-expiring`, then add its certificate paths to the HTTPS server block and test/reload Nginx.

## Mobile app configuration

Production mobile API traffic was changed from the temporary `sslip.io` hostname to the permanent domain:

```text
mobile/src/component/global.js
LIVE_SERVER = https://api.maxsocialapp.com
```

`.gitignore` was updated to ignore `*.pem` and `secrets/` to prevent accidental private-key commits.

## DNS troubleshooting note

Immediately after the root domain was created, this workstation's configured resolver (`dns1.fortiguard.net`) cached NXDOMAIN. Google (`8.8.8.8`), Cloudflare (`1.1.1.1`), and the Route 53 authoritative nameserver resolved the record correctly. If that recurs, flush local DNS (`ipconfig /flushdns`) or use a public resolver; do not remove the Route 53 records.
