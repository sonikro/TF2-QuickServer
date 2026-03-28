#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="${1:-fat-server-i386}"
TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-300}"
POLL_SECONDS="${POLL_SECONDS:-5}"

echo "[rebuild-run-server] Rebuilding and starting service: ${SERVICE_NAME}"
docker compose up -d --build "${SERVICE_NAME}"

CONTAINER_ID="$(docker compose ps -q "${SERVICE_NAME}")"
if [[ -z "${CONTAINER_ID}" ]]; then
  echo "[rebuild-run-server] ERROR: Could not resolve container for service ${SERVICE_NAME}" >&2
  exit 1
fi

CONTAINER_NAME="$(docker inspect -f '{{.Name}}' "${CONTAINER_ID}" | sed 's#^/##')"
echo "[rebuild-run-server] Container: ${CONTAINER_NAME} (${CONTAINER_ID})"

echo "[rebuild-run-server] Waiting for running/healthy state..."
start_epoch="$(date +%s)"
while true; do
  state="$(docker inspect -f '{{.State.Status}}' "${CONTAINER_ID}")"
  health="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "${CONTAINER_ID}")"

  if [[ "${state}" == "running" && ( "${health}" == "healthy" || "${health}" == "none" ) ]]; then
    echo "[rebuild-run-server] Container ready: state=${state}, health=${health}"
    break
  fi

  now_epoch="$(date +%s)"
  elapsed="$((now_epoch - start_epoch))"
  if (( elapsed >= TIMEOUT_SECONDS )); then
    echo "[rebuild-run-server] ERROR: Timed out waiting for readiness after ${elapsed}s (state=${state}, health=${health})" >&2
    docker logs --tail 120 "${CONTAINER_ID}" || true
    exit 1
  fi

  sleep "${POLL_SECONDS}"
done

LOG_SAMPLE="$(docker logs --tail 1200 "${CONTAINER_ID}" 2>&1 || true)"

SDR_ENDPOINT="$(printf '%s\n' "${LOG_SAMPLE}" | sed -nE 's/.*udp\/ip[[:space:]]*:[[:space:]]*(([0-9]{1,3}\.){3}[0-9]{1,3}:[0-9]{2,5}).*/\1/p' | tail -n 1)"
if [[ -z "${SDR_ENDPOINT}" ]]; then
  SDR_ENDPOINT="$(printf '%s\n' "${LOG_SAMPLE}" | sed -nE 's/.*sourcetv:[[:space:]]*(([0-9]{1,3}\.){3}[0-9]{1,3}:[0-9]{2,5}).*/\1/p' | tail -n 1)"
fi

PUBLIC_IP="$(printf '%s\n' "${LOG_SAMPLE}" | sed -nE 's/.*public IP from Steam:[[:space:]]*(([0-9]{1,3}\.){3}[0-9]{1,3}).*/\1/p' | tail -n 1)"

echo
if [[ -n "${SDR_ENDPOINT}" ]]; then
  echo "[rebuild-run-server] SDR_IP=${SDR_ENDPOINT}"
  if [[ -n "${PUBLIC_IP}" ]]; then
    echo "[rebuild-run-server] PUBLIC_IP=${PUBLIC_IP}"
  fi
  echo "[rebuild-run-server] CONNECT_COMMAND=connect ${SDR_ENDPOINT}"
  exit 0
fi

echo "[rebuild-run-server] ERROR: Could not find SDR IP in recent logs." >&2
echo "[rebuild-run-server] Recent relevant lines:" >&2
printf '%s\n' "${LOG_SAMPLE}" | grep -Ei 'udp/ip|sourcetv|public IP from Steam|hostname|map' | tail -n 40 >&2 || true
exit 2
