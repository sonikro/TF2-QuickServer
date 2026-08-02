# Scheduling

## /schedule <region> <time> <timezone>

Schedule a server to be created and ready at a specific time.

- `time` is 24h `HH:mm` (e.g. `21:30`). Invalid formats are rejected.
- `timezone` is chosen from a fixed list of 25 IANA timezones, grouped by region:
  - UTC
  - America: New_York, Chicago, Denver, Los_Angeles, Sao_Paulo, Argentina/Buenos_Aires, Bogota
  - Europe: London, Lisbon, Madrid, Paris, Berlin, Rome, Amsterdam, Warsaw, Moscow, Istanbul
  - Asia: Dubai, Kolkata, Bangkok, Singapore, Tokyo, Seoul
  - Australia/Pacific: Sydney

## How it works

After `/schedule`, the bot shows variant buttons. Pick one, and you get an ephemeral confirmation with the region, variant, ready time in your timezone, in UTC, and relative ("in Xh Ym"). The bot also DMs you a confirmation — DMs MUST be enabled, otherwise the schedule is not created ("I need to be able to DM you to deliver your server connection info…").

## When does my server start?

Creation begins about 5 minutes before the ready time (per-region lead, default 5 minutes) so the server is ready on time.

## Limits

You can only have ONE active schedule per user ("You can only schedule one server at a time…"). Once created, normal server rules apply — see [Rules and Restrictions](#rules-and-restrictions).

## /show-schedules

Ephemeral list of your schedules: region, variant, status, and ready time (your timezone + UTC + relative).

| Status | Meaning |
|--------|---------|
| ⏳ scheduled | Waiting for creation to start |
| 🛠️ creating | Server is being created |
| ✅ created | Server is ready |
| ❌ failed | Something went wrong |
| 🚫 cancelled | Cancelled before creation started |

## /cancel-schedule

Cancels an active schedule before creation starts.

## What happens if something goes wrong?

A background routine runs every minute and claims due schedules. A schedule stuck in `creating` for over 20 minutes is marked failed and you are DM'd. If the bot was offline past the trigger time plus a 30-minute grace period, the schedule is marked failed and you are DM'd.
