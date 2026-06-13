# Datasette Analytics

This project includes a [Datasette](https://datasette.io/) sidecar container
that turns your SQLite database into a password-protected web UI for querying
and browsing data.

## Running

```bash
# Set your admin password
echo 'DATASETTE_PASSWORD=your-password' >> .env

# Start the container
docker compose --profile analytics up -d datasette
```

The container mounts `./db/` as read-only and binds to port `8001` with
HTTP Basic authentication (username: `admin`, password: whatever you set).

## Usage

1. Open `http://your-server:8001` in your browser
2. Log in with `admin` / your password
3. Browse tables, write SQL queries, export results as CSV or JSON

## Stopping

```bash
docker compose --profile analytics down datasette
```
