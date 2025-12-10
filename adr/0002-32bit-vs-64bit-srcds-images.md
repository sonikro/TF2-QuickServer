# ADR 0002: 32-bit vs 64-bit SRCDS Images

**Status:** Accepted

**Date:** 2025-12-10

## Context

In the Santiago region of Oracle Cloud, a kernel update was deployed that unexpectedly caused 32-bit SRCDS processes to crash. After reaching out to Oracle support, there was uncertainty about whether this breaking change would be rolled out to all other regions. Given the severity of the issue and the potential to completely halt the project, we needed to ensure continuity of service.

We discovered that the 64-bit version of SRCDS was still functioning properly in the affected region. To mitigate the risk, we decided to port the entire server infrastructure to 64-bit, which required recompiling and rewriting several SourceMod plugins and extensions that were not compatible with 64-bit architecture.

Approximately one month after the migration, Oracle informed us that the kernel issue was an error on their side and had been reverted in the Santiago region, allowing 32-bit SRCDS to run again without issues.

## Decision

We have decided to rollback the default server images to 32-bit SRCDS while continuing to build and maintain 64-bit images as a backup. The effort required to maintain competitive plugins on 64-bit architecture outweighs the benefit of using it as the primary platform, but we retain it as a contingency plan should similar infrastructure issues occur in the future.

## Consequences

### Positive

- Reduced maintenance burden for competitive plugin development and primary deployments
- Alignment with the broader TF2 competitive community which predominantly uses 32-bit
- Simpler deployment pipeline with a single default image variant
- Retains 64-bit backup images for rapid failover if infrastructure issues recur
- Provides insurance against similar kernel issues from cloud providers

### Negative

- Ongoing maintenance cost of building and supporting dual 64-bit image variants
- Potential technical debt from maintaining 64-bit plugins that are not actively used
- Risk of 64-bit images becoming stale if not regularly deployed and tested

## Alternatives Considered

- **Continue with 64-bit exclusively:** While this would have eliminated the need to rollback, the effort required to port all remaining plugins (particularly tf2-comp-fixes which requires DHook) made this infeasible within the project's constraints.
- **Abandon 64-bit images entirely:** This would have eliminated maintenance overhead but removes the ability to quickly failover if similar infrastructure issues occur in the future. By keeping 64-bit as a backup, we maintain optionality at minimal additional cost.

## References

- Oracle Cloud Infrastructure Santiago region kernel incident (December 2025)
- Recompiled plugins: logs.tf, SrcTV+, SteamPawns, cURL
- Plugins that could not be migrated: tf2-comp-fixes (requires DHook extension)
- Forked repositories for 64-bit compatibility:
  - https://github.com/sonikro/srctvplus
  - https://github.com/sonikro/TFTrue
  - https://github.com/sonikro/SM-SteamPawn
  - https://github.com/sonikro/F2s-sourcemod-plugins
  - https://github.com/sonikro/SteamWorks
  - https://github.com/sonikro/SM-neocurl-ext
