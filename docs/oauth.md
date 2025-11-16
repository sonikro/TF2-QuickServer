# OAuth Authentication with Auth0

## Overview

The HTTP API entrypoint uses Auth0 for authentication via OAuth 2.0 Client Credentials flow. This enables machine-to-machine (M2M) authentication where client applications authenticate using a client ID and client secret to obtain access tokens.

## Architecture

- **JWT Validation**: All routes under `/api/*` require a valid JWT token from Auth0
- **Public Routes**: Health check endpoint (`/healthz`) is publicly accessible
- **Stateless**: No session management; each request is validated independently
- **Token Format**: Bearer tokens in the `Authorization` header

## Authentication Flow

1. Client application requests a token from Auth0's token endpoint
2. Auth0 validates credentials and returns a JWT access token
3. Client includes token in API requests: `Authorization: Bearer <token>`
4. Our API validates the token signature, expiration, audience, and issuer
5. If valid, the request proceeds; otherwise, returns 401 Unauthorized

## Local Setup

### 1. Create Auth0 Account

Sign up for a free Auth0 account at https://auth0.com

### 2. Configure Auth0 API

In the Auth0 Dashboard:

1. Navigate to **Applications → APIs**
2. Click **Create API**
3. Configure:
   - **Name**: TF2-QuickServer API (or your preferred name)
   - **Identifier**: Your API audience
   - **Signing Algorithm**: RS256
4. Click **Create**

### 3. Define Scopes

In the **Permissions** tab, add the following scopes:

```
read:servers         - Allows reading data from all servers
create:servers       - Allow creating servers
read:servers:own     - Allows only reading data from the servers created by the client
delete:servers:own   - Allows deleting your own created servers
delete:servers       - Allows deleting all servers
```

### 4. Create Machine-to-Machine Application

1. Navigate to **Applications → Applications**
2. Click **Create Application**
3. Choose **Machine to Machine Applications**
4. Select your API
5. Grant desired scopes (select from the scopes defined in step 3)
6. Note the **Client ID** and **Client Secret**

### 5. Configure Environment Variables

Add to your `.env` file:

```bash
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_AUDIENCE=your-audience
```

Replace `your-tenant.auth0.com` with your Auth0 domain and `your-audience` with your API identifier.

## Testing Authentication

### Get Access Token

```bash
curl -X POST https://YOUR_DOMAIN/oauth/token \
  -H 'content-type: application/json' \
  -d '{
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "YOUR_CLIENT_SECRET",
    "audience": "YOUR_API_IDENTIFIER",
    "grant_type": "client_credentials"
  }'
```

Response:
```json
{
  "access_token": "eyJhbGc...",
  "token_type": "Bearer",
  "expires_in": 86400
}
```

### Call Protected API

```bash
curl -X GET http://localhost:3000/api/status \
  -H 'Authorization: Bearer eyJhbGc...'
```

### View Token Claims

```bash
curl -X GET http://localhost:3000/api/profile \
  -H 'Authorization: Bearer eyJhbGc...'
```

## Implementation Details

### Request Object

After successful authentication, the Express request object is extended with:

```typescript
req.auth = {
  payload: {
    iss: string;           // Issuer (Auth0 domain)
    sub: string;           // Subject (client ID)
    aud: string[];         // Audience
    iat: number;           // Issued at
    exp: number;           // Expiration
    azp: string;           // Authorized party
    scope: string;         // Space-separated scopes
  }
}
```

### Error Responses

**401 Unauthorized** - Missing or invalid token:
```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing authentication token"
}
```

**500 Internal Server Error** - Validation error:
```json
{
  "error": "Internal Server Error",
  "message": "Authentication validation failed"
}
```

## Disabling Authentication

If `AUTH0_DOMAIN` or `AUTH0_AUDIENCE` environment variables are not set, authentication is disabled and all API routes become publicly accessible. This is useful for local development without Auth0 configuration.