# Trusted local setup

Use Node 24 and run `npm install` in the repository. The one-time system steps below are explicit because local HTTPS needs a trusted development CA and cross-site experiments need separate names.

## Windows

1. Install mkcert:
   ```powershell
   winget install --id FiloSottile.mkcert --exact
   ```
   Chocolatey is an alternative: `choco install mkcert`. Reopen your terminal if PATH changes.
2. Run `mkcert -install` and accept the Windows trust prompt.
3. Open Notepad **as Administrator** and edit `C:\Windows\System32\drivers\etc\hosts`. Add:
   ```text
   # Web Security Laboratory
   127.0.0.1 app.security-lab.test sibling.security-lab.test attacker.csrf-lab.test
   ```
4. Back in your ordinary terminal, run `npm run setup`, then `npm run dev`.

An optional alternative to steps 2–3 is to explicitly run the reviewed `scripts/configure-windows.ps1` in Administrator PowerShell. That script trusts the CA and appends missing loopback mappings; npm never invokes it. It stops before changing anything if it is not elevated.

## macOS

```sh
brew install mkcert nss
mkcert -install
sudo nano /etc/hosts
```

Add the same mapping line shown above. Save, then run `npm run setup`.

## Linux (Debian/Ubuntu)

```sh
sudo apt update
sudo apt install libnss3-tools
```

Install the mkcert binary for your architecture from its [official release page](https://github.com/FiloSottile/mkcert/releases), make it executable and place it on PATH. For Linux amd64 v1.4.4:

```sh
curl -L -o mkcert https://github.com/FiloSottile/mkcert/releases/download/v1.4.4/mkcert-v1.4.4-linux-amd64
echo "6d31c65b03972c6dc4a14ab429f2928300518b26503f58723e532d1b0a3bbb52  mkcert" | sha256sum -c -
chmod +x mkcert
sudo install mkcert /usr/local/bin/mkcert
mkcert -install
sudo nano /etc/hosts
```

Add the mapping line. If Chromium dependencies are missing, run `npx playwright install --with-deps chromium`. For distributions other than Debian/Ubuntu, use the matching package manager and [mkcert instructions](https://github.com/FiloSottile/mkcert).

Chromium needs access to the trusted CA. On Linux, install `libnss3-tools` before trusting the CA; create a user NSS database if needed:

```sh
mkdir -p "$HOME/.pki/nssdb"
certutil -N --empty-password -d "sql:$HOME/.pki/nssdb"
mkcert -install
```

Do not initialize over an existing NSS database; run those initialization commands only when the database does not exist.

Recent Chromium versions default to `$HOME/.local/share/pki/nssdb`, but use the older `$HOME/.pki/nssdb` when it already exists. The CI setup creates that older database before installing trust. For an existing browser installation, use its active database as described in [Chromium's Linux certificate documentation](https://chromium.googlesource.com/chromium/src/+/master/docs/linux/cert_management.md).

## What setup does

`npm run setup` locates mkcert on PATH (or `MKCERT_PATH`, or an ignored `.tools/mkcert[.exe]`), generates a leaf certificate for the three exact names and installs the Playwright Chromium version associated with the lockfile.

The doctor verifies Node, DNS mappings, ports, certificate hostnames/validity and actual Chromium HTTPS trust using a temporary loopback server. Setup fails if any check fails. No TLS bypass or self-signed fallback is enabled.

The CA lives outside the repository in the directory printed by `mkcert -CAROOT`. The repository contains only ignored leaf certificate/key files under `certs/`. Never commit, upload or share `rootCA-key.pem`; it can sign certificates trusted by your computer.

## Troubleshooting

- **Name cannot resolve:** verify the exact hosts mapping. Windows: `Resolve-DnsName app.security-lab.test`; macOS/Linux: use your OS resolver. VPNs, proxies and secure DNS settings can affect local resolution.
- **Certificate warning:** run `mkcert -install`, restart the browser, then rerun `npm run setup`. Do not click through certificate warnings or turn off validation.
- **Port occupied:** stop your previous lab process. The lab requires 8443 and 8080 and does not silently choose new ports.
- **Doctor says ports occupied while dev is running:** stop dev before doctor.
- **Browser executable missing:** run `npx playwright install chromium`.
- **None-cookie iframe/fetch results differ:** browser privacy controls may block third-party cookies. Use top-level forms to isolate SameSite, then inspect the actual embedded/fetch observation separately.
- **Browser fetch reports CORS:** inspect the server observation and state; the server may already have processed the request.
- **HTTP request upgraded to HTTPS:** use a clean dedicated profile without an HSTS policy or an HTTPS-only exception for the probe.
- **Corporate trust restrictions:** use a permitted local development environment. The project intentionally does not bypass certificate validation.
- **WSL/Docker:** not the reference setup. Hosts entries and trust must be configured in the environment where the browser runs, and listeners stay on loopback. Prefer native setup for this release.

## Undo

1. Stop the lab.
2. Remove only its three hostname mappings (and its comment) from your hosts file.
3. To remove the mkcert CA from trust stores, run `mkcert -uninstall`. This can affect other local projects using the same CA; review that before removing it.
4. Remove the lab leaf certificate/key files if no longer needed.
5. Clear site data for the three local hostnames in your dedicated browser profile.

There is no automated deletion of unrelated hosts entries, certificates or browser profiles.
