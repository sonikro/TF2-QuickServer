# TF2-QuickServer

TF2-QuickServer is a Discord bot that provisions and manages Team Fortress 2 competitive servers on Oracle Cloud Infrastructure (OCI). The project consists of a TypeScript/Node.js Discord bot with SQLite database and a Go-based network shield for DDoS protection.

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Working Effectively

### Prerequisites
- Node.js v22 (check `.nvmrc` file)
- Go 1.21+ (for Shield component)
- Docker and Docker Compose
- Terraform (for Oracle Cloud deployment)
- Oracle Cloud Infrastructure account and credentials

### Bootstrap and Build
**CRITICAL**: The main Node.js application has a JSR registry dependency issue that prevents `npm install` from working in many environments.

```bash
# Check Node.js version matches .nvmrc (should be v22)
node --version

# Main application - npm install FAILS due to JSR registry dependency
npm ci  # FAILS: "@c43721/srcds-log-receiver" dependency from npm.jsr.io is unreachable

# Alternative: Use Docker build (recommended for deployment)
docker build -f Dockerfile . -t tf2-quickserver  # Takes 3-5 minutes if npm works

# Shield component (Go) - ALWAYS WORKS
cd shield/
go mod download  # Takes 6 seconds
make test        # Takes 25 seconds. NEVER CANCEL. Set timeout to 60+ seconds.
make build       # Takes 0.5 seconds. Creates bin/shield binary
cd ..
```

### Environment Setup
Create `.env` file from `.env.example`:
```bash
cp .env.example .env
# Edit .env with required values:
# - DISCORD_TOKEN (required)
# - DISCORD_CLIENT_ID (required)
# - OCI_CONFIG_FILE (required for Oracle Cloud)
# - DEMOS_TF_APIKEY (required for logs.tf integration)
# - LOGS_TF_APIKEY (required for logs.tf integration)
```

### Database Setup
```bash
# Initialize SQLite database
npm run migration:run  # FAILS if npm install failed
# Alternative: Run directly with tsx
npx tsx node_modules/.bin/knex --knexfile knexfile.ts migrate:latest
```

### Running the Application
**Note**: These commands require successful npm install, which currently fails.

```bash
# Development mode with auto-reload
npm run dev  # FAILS if dependencies not installed

# Production mode
npm start   # FAILS if dependencies not installed

# Using Docker Compose (recommended)
docker-compose --profile bot up  # Builds and runs the bot
docker-compose --profile server up  # Runs TF2 server for testing
```

### Oracle Cloud Infrastructure Deployment
```bash
# Deploy OCI infrastructure (requires terraform and OCI credentials)
npm run oracle:deploy  # Takes 5-10 minutes. NEVER CANCEL. Set timeout to 15+ minutes.
# This creates config/local.json with OCI resource information
```

### TF2 Server Variants
Build TF2 server Docker images:
```bash
# Standard competitive variant
npm run build:standard-competitive  # Takes 10-15 minutes. NEVER CANCEL.

# Fat variant with maps pre-downloaded
npm run build:fat:standard-competitive  # Takes 30-45 minutes. NEVER CANCEL. Set timeout to 60+ minutes.

# Push to registry
npm run push:fat:standard-competitive
```

## Testing

### Unit Tests
```bash
# Run all tests (requires npm install to work)
npm test  # Takes 10-15 seconds

# Run tests with coverage
npm run test -- --coverage

# Shield tests (Go)
cd shield/
make test  # Takes 25 seconds. NEVER CANCEL.
```

### Manual Testing
```bash
# Test TF2 server locally
docker-compose --profile server up

# Test specific variant
docker run -p 27015:27015 -p 27015:27015/udp sonikro/tf2-standard-competitive:latest

# Connect to server: steam://connect/localhost:27015
```

## Validation

### Always Run Before Committing
1. **Shield build and test**:
   ```bash
   cd shield/
   make test && make build
   cd ..
   ```

2. **JSON validation**:
   ```bash
   cat config/default.json | jq empty  # Validates JSON syntax
   ```

3. **Docker builds** (if npm works):
   ```bash
   docker build -f Dockerfile . -t test-build  # Takes 3-5 minutes
   ```

### Manual Validation Scenarios
**CRITICAL**: Always manually test Discord bot functionality after code changes:

1. **Discord Bot Commands**:
   - `/create-server <region>` - Creates a TF2 server
   - `/terminate-servers` - Terminates user's servers  
   - `/set-user-data <steamId>` - Sets Steam ID for admin privileges

2. **Shield Validation**:
   ```bash
   cd shield/
   # Shield requires OCI credentials, will fail with "bad configuration" error without proper setup
   ./bin/shield  # Expected to fail with OCI config error - this is normal
   ```

3. **Database Operations**:
   - Verify migrations run without errors
   - Check SQLite database created in `db/database.sqlite3`

4. **JSON Configuration Validation**:
   ```bash
   cat config/default.json | jq empty  # Takes <0.1 seconds, validates JSON syntax
   ```

5. **Docker Variant Builds** (if possible):
   ```bash
   # Test standard competitive variant build (uses external base image)
   docker build -f variants/standard-competitive/Dockerfile . -t test-variant
   # Expected: Success, downloads from ghcr.io/melkortf/tf2-competitive:latest
   ```

## Known Issues

### Critical Build Issues
- **npm install FAILS**: JSR registry dependency "@c43721/srcds-log-receiver" is unreachable
  - **Error**: "request to https://npm.jsr.io/~/11/@jsr/c43721__srcds-log-receiver/1.1.4-rc1.tgz failed, reason: getaddrinfo ENOTFOUND npm.jsr.io"
  - **Workaround**: Use Docker builds or pre-built images
  - **DO NOT** try to work around this by modifying package.json
  - **Expected**: This blocks local development until dependency is fixed

### Environment Dependencies
- **Shield requires OCI credentials**: Expected to fail with "bad configuration: did not find a proper configuration for tenancy" without OCI setup
- **Terraform not installed locally**: Use `terraform --version` to check availability
- **Docker builds work**: Variant Dockerfiles successfully pull from external registries

### Timing Expectations
- **Shield tests**: 25 seconds. NEVER CANCEL. Set timeout to 60+ seconds.
- **Shield build**: 0.5 seconds
- **Docker builds**: 3-5 minutes for main app, 30-45 minutes for fat variants
- **Terraform apply**: 5-10 minutes. NEVER CANCEL. Set timeout to 15+ minutes.
- **npm operations**: Would be 1-2 minutes if working
- **JSON validation**: <0.1 seconds

## Common Tasks

### Repository Structure
```
TF2-QuickServer/
├── src/                          # TypeScript source code
│   ├── core/                     # Domain logic and use cases
│   ├── entrypoints/             # Discord bot commands and HTTP endpoints
│   ├── providers/               # Infrastructure implementations
│   └── index.ts                 # Main application entry point
├── shield/                       # Go-based DDoS protection service
│   ├── main.go                  # Shield main entry point
│   ├── pkg/                     # Shield packages
│   └── Makefile                 # Shield build commands
├── oracle-terraform/            # Terraform for OCI infrastructure
├── variants/                    # TF2 server Docker variants
├── migrations/                  # Database migration files
├── config/                      # Application configuration
└── db/                         # SQLite database and ban lists
```

### Key Files to Monitor
- `src/entrypoints/discordBot.ts` - Main Discord bot entry point
- `src/entrypoints/commands/` - Discord command implementations
- `src/core/usecase/` - Business logic implementations
- `config/default.json` - Region and variant configurations
- `package.json` - Dependencies and scripts
- `knexfile.ts` - Database configuration

### Development Workflow
1. **ALWAYS** test Shield component first (it works reliably)
2. Use Docker for Node.js development due to dependency issues
3. Validate JSON files before committing
4. Test Discord commands manually when possible
5. Never cancel long-running builds or Terraform operations
6. Set appropriate timeouts for all operations (60+ minutes for builds)

### Oracle Cloud Integration
- Requires OCI credentials in `OCI_CONFIG_FILE` environment variable
- Creates container instances dynamically for TF2 servers
- Uses Network Security Groups for firewall management
- Shield component integrates with OCI APIs for DDoS protection

### Discord Bot Architecture
- Uses discord.js v14 for Discord API interaction
- Commands defined in `src/entrypoints/commands/`
- SQLite database for persistence
- OpenTelemetry for observability
- Express.js for webhook endpoints (PayPal, Adyen)

## CI/CD and GitHub Workflows

### Main Release Workflow (`.github/workflows/release.yaml`)
Triggers on push to main or PR creation:
1. **Build steps** (takes 2-3 minutes total):
   - Node.js setup from `.nvmrc` (v22)
   - `npm ci` (60-90 seconds)
   - `npm run build` (TypeScript compilation, 10-30 seconds)  
   - `npm test` (Unit tests, 10-15 seconds)
2. **Validation**:
   - JSON validation of `config/default.json`
   - Artifact upload for config and ban list
3. **Docker build and push** (3-5 minutes)
4. **Deployment** to production (if push to main)

### Shield Workflow (`.github/workflows/shield.yml`)
Triggers on changes to `shield/` directory:
1. **Go setup** from `shield/go.mod`
2. **Test**: `make test` (25 seconds)
3. **Build**: `make build` (0.5 seconds)
4. **Docker build and push** (2-3 minutes)

### Always Follow CI Standards
```bash
# Replicate CI validation locally before committing
cd shield/
make test && make build  # Must pass
cd ..

# Validate JSON (required for CI)
cat config/default.json | jq empty

# Check CI will have required files
ls -la config/default.json db/bans.csv  # Must exist
```

## Troubleshooting

### Common Error Messages
1. **"Cannot find module 'knex'"**: npm install failed, dependencies missing
2. **"request to https://npm.jsr.io failed"**: JSR registry unreachable - expected issue
3. **"bad configuration: did not find a proper configuration for tenancy"**: Shield missing OCI credentials - expected without setup
4. **"terraform: command not found"**: Terraform not installed - use Docker for Terraform operations

### Debug Commands
```bash
# Check environment
node --version  # Should match .nvmrc (v22)
docker --version  # Required for builds
go version  # Required for Shield

# Check project state  
ls -la node_modules/  # Will be missing if npm install failed
ls -la shield/bin/shield  # Should exist after make build
ls -la config/local.json  # Created by terraform deployment

# Validate configurations
cat .env | grep -v '^#' | grep '='  # Check env vars set
jq keys config/default.json  # Check config structure
```

### Recovery Procedures
```bash
# Clean build state
rm -rf node_modules/ package-lock.json
rm -rf shield/bin/

# Rebuild Shield (always works)
cd shield/
make build
cd ..

# Clean Docker state if needed
docker system prune -f
docker build -f Dockerfile . -t tf2-quickserver --no-cache
```