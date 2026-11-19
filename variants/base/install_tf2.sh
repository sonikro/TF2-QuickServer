#!/bin/bash
set -e

max_retries=3
retry_count=0
steamcmd_probe_url=https://client-download.steampowered.com/client/steamcmd_linux.tar.gz

# The build host decides whether SteamCMD can open a socket at all, and that has
# broken image builds before (ADR 0005). When every retry fails, print what
# SteamCMD saw plus the build host's view of its download endpoint.
report_failure_diagnostics() {
  echo "=== SteamCMD failure diagnostics ==="

  if [ -f "$HOME/Steam/logs/stderr.txt" ]; then
    echo "--- Steam/logs/stderr.txt (last 40 lines) ---"
    tail -n 40 "$HOME/Steam/logs/stderr.txt" || true
  fi

  echo "--- Name resolution ---"
  resolved_host=$(getent hosts client-download.steampowered.com | head -n 1)
  echo "${resolved_host:-cannot resolve client-download.steampowered.com}"

  echo "--- Download endpoint ---"
  if command -v wget >/dev/null; then
    wget -S --spider --timeout=15 "$steamcmd_probe_url" 2>&1 | head -n 20 || true
  else
    echo "wget is not installed, skipping the HTTP probe"
  fi
}

while [ $retry_count -lt $max_retries ]; do
  if steamcmd +runscript "$HOME/tf2.txt"; then
    exit 0
  fi

  retry_count=$((retry_count + 1))
  if [ $retry_count -lt $max_retries ]; then
    echo "Steamcmd failed. Retrying ($retry_count/$max_retries)..."
    sleep 5
  fi
done

echo "Failed to install TF2 after $max_retries attempts"
report_failure_diagnostics
exit 1
