# tf2pickup Integration

## Overview

The `tf2pickup` variant uses the `sonikro/fat-tf2-pickup:latest` Docker image, which includes the [tf2pickup connector plugin](https://github.com/tf2pickup-org/connector). On startup, the server automatically registers itself with your tf2pickup instance — no manual setup is required after creation.

Servers created with this variant will auto-terminate after **60 minutes** of being empty.

## Prerequisites

You need an Auth0 M2M access token. See [oauth.md](oauth.md) for instructions on obtaining one.

## Creating a tf2pickup Server

Call `POST /api/servers` with `variantName` set to `"tf2pickup"` and provide the required `extraEnvs`.

### Required `extraEnvs`

| Variable | Description |
|---|---|
| `TF2PICKUPORG_API_ADDRESS` | The base URL of your tf2pickup instance (e.g. `https://br.tf2pickup.org`) |
| `TF2PICKUPORG_SECRET` | The shared secret configured in your tf2pickup instance |

### Optional `extraEnvs`

| Variable | Description |
|---|---|
| `SERVER_HOSTNAME` | Overrides the in-game server hostname. Useful when running a tf2pickup instance with a different domain. |

## Example

```bash
# 1. Obtain an access token
TOKEN=$(curl -s -X POST https://tf2-quickserver.us.auth0.com/oauth/token \
  -H 'content-type: application/json' \
  -d '{
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "YOUR_CLIENT_SECRET",
    "audience": "https://tf2-quickserver.sonikro.com",
    "grant_type": "client_credentials"
  }' | jq -r '.access_token')

# 2. Create the server
curl -X POST https://tf2-quickserver.sonikro.com/api/servers \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "region": "sa-saopaulo-1",
    "variantName": "tf2pickup",
    "extraEnvs": {
      "TF2PICKUPORG_API_ADDRESS": "https://br.tf2pickup.org",
      "TF2PICKUPORG_SECRET": "your-pickup-secret",
      "SERVER_HOSTNAME": "br.tf2pickup.org"
    }
  }'
```

The response contains a `taskId`. Poll `GET /api/tasks/{taskId}` to check when the server is ready. Server creation typically takes **4–6 minutes**.

## Available Regions

| Region key | Location |
|---|---|
| `sa-saopaulo-1` | São Paulo |
| `sa-santiago-1` | Santiago |
| `sa-bogota-1` | Bogotá |
| `us-chicago-1` | Chicago |
| `eu-frankfurt-1` | Frankfurt |
| `ap-sydney-1` | Sydney |
| `us-east-1-bue-1` | Buenos Aires (Experimental) |
| `us-east-1-lim-1` | Lima (Experimental) |

## Checking for Running Servers

Before creating a new server, the tf2pickup platform can call `GET /api/servers` to list all servers currently running under its credentials. This avoids spinning up duplicates when a server is already available.

```bash
curl https://tf2-quickserver.sonikro.com/api/servers \
  -H "Authorization: Bearer $TOKEN"
```

The response is an array of server objects. A server is ready to use when its `status` field is `"ready"`.

## Notes

- The server registers itself to the tf2pickup platform automatically.
- The task result's `result` field will contain the server object once `status` is `"completed"`. See [api/openapi.yaml](api/openapi.yaml) for the full schema.
- To delete the server before the auto-termination kicks in, call `DELETE /api/servers/{serverId}`.
