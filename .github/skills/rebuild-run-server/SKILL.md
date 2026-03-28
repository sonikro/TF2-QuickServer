---
name: rebuild-run-server
description: "Rebuild and run the TF2 test server container, then extract and report the generated SDR IP from logs. Use when asked things like 'rebuild and run the server', 'rebuild annd run the server', 'start fat-server-i386', 'restart test server', or 'get SDR IP'."
argument-hint: "Optional service name (default: fat-server-i386)"
---

# Rebuild And Run Server

## When To Use
- Rebuild and start the test TF2 server used for local validation.
- Fetch the generated SDR IP from server logs after startup.
- Confirm the server is running before sharing connection info.

## Default Target
- Compose service: `fat-server-i386`
- Container name: `tf2-fat-server-i386`

## Primary Workflow
1. Rebuild and start the service:
```bash
docker compose up -d --build fat-server-i386
```
2. Wait for container readiness (`running` and, if defined, `healthy`).
3. Read recent logs and extract SDR endpoint from the latest status block.
4. Share SDR IP with the user in connect-ready format.

## Preferred Command
Use the bundled helper script:

```bash
bash ./.github/skills/rebuild-run-server/scripts/rebuild-run-server.sh
```

Optional service override:

```bash
bash ./.github/skills/rebuild-run-server/scripts/rebuild-run-server.sh fat-server-i386
```

## What To Share With The User
Always report:
- Service and container status.
- The extracted SDR IP in `ip:port` format.
- A connect hint using the same endpoint:

```text
connect <sdr-ip:port>
```

If SDR IP is not found:
- Say startup succeeded/failed clearly.
- Report that SDR extraction failed.
- Include the last relevant log lines and ask whether to continue monitoring logs.

## Notes
- SDR IP is parsed from lines like: `udp/ip  : 169.254.77.146:3392`.
- Fallback parser also checks `sourcetv:` lines if `udp/ip` is not present.
