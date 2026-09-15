---
name: oci-mcp
description: "Use when changing which Oracle Cloud region or tenancy profile the local oci-cloud MCP server in this repository uses — switching OCI_CONFIG_PROFILE in opencode.json and restarting the server. Profile is resolved at startup only; there is no per-call profile override."
---

# OCI MCP Profile Switching

The `oci-cloud` MCP server (`oracle.oci-cloud-mcp-server`, launched via uvx
and declared in `opencode.json` under `mcp.oci-cloud`) exposes the full OCI
Python SDK, including `oci.container_instances.ContainerInstanceClient`.

## Startup-Only Profile Resolution

The OCI profile is resolved **once at MCP server startup** via the
`OCI_CONFIG_PROFILE` environment variable. There is **no
per-request/per-call profile parameter** — tools ignore any such attempt.

## Switching Region or Tenancy

1. Read `~/.oci/config` to discover the available profile names.
2. Edit `mcp.oci-cloud.environment.OCI_CONFIG_PROFILE` in `opencode.json`:

```json
"environment": {
  "OCI_CONFIG_PROFILE": "<profile-name>"
}
```

3. Restart opencode (or toggle the MCP server) for the change to take effect.

Profile names belong to `~/.oci/config`, which is machine-local and not part
of the repo. Read it to discover profiles; never copy tenancy, credential, or
OCID values from it into tracked files.
