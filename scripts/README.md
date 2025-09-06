# Bans CSV Validation

This directory contains scripts to validate the `db/bans.csv` file for:

1. **CSV Structure**: Ensures the file has the correct CSV format with expected headers
2. **Steam3 ID Format**: Validates that Steam IDs are in the correct Steam3 format (`U:1:xxxxxxxxx`)

## Files

- `validate-bans.js`: Main validation script
- `test-validate-bans.js`: Test suite for the validation script

## Usage

```bash
# Validate the current bans.csv file
node scripts/validate-bans.js

# Run the validation tests
node scripts/test-validate-bans.js
```

## Expected CSV Format

The `db/bans.csv` file should have the following structure:

```csv
steam_id,discord_user_id,created_at,reason
U:1:123456,,2025-06-21 23:18:58,Banned from FBTF
U:1:789012,discord123,2025-06-21 23:19:05,Another ban reason
```

### Column Requirements

- `steam_id`: Required, must be in Steam3 format (`U:1:xxxxxxxxx`)
- `discord_user_id`: Optional Discord user ID
- `created_at`: Optional timestamp
- `reason`: Optional ban reason

## GitHub Actions

The validation runs automatically on:
- Pull requests to main branch that modify `db/bans.csv`
- Pushes to main branch that modify `db/bans.csv`

The workflow is defined in `.github/workflows/validate-bans.yaml`.