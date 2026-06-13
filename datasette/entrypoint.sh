#!/bin/bash
set -euo pipefail

# Generate password hash using datasette's own tool (pbkdf2_sha256)
HASH=$(echo "${DATASETTE_PASSWORD:-admin}" | datasette hash-password --no-confirm)

# Write metadata config with password auth
cat > /etc/datasette/metadata.yml <<YAMLEOF
title: "TF2 QuickServer Analytics"
plugins:
  datasette-auth-passwords:
    admin_password_hash: ${HASH}
    http_basic_auth: true
YAMLEOF

exec datasette \
  --metadata /etc/datasette/metadata.yml \
  --setting max_returned_rows 10000 \
  --setting sql_time_limit_ms 10000 \
  "$@"
