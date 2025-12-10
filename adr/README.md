# Architecture Decision Records (ADRs)

This directory contains architecture decision records for TF2 QuickServer. An ADR is a document that records an important architectural decision made along with its context and consequences.

## Format

ADRs follow the Nygard format, which includes:

- **Title:** A concise description of the decision
- **Status:** The current state (Proposed, Accepted, Deprecated, or Superseded)
- **Date:** When the decision was made
- **Context:** The issue or problem that necessitated the decision
- **Decision:** What was decided and why
- **Consequences:** The positive and negative impacts of the decision
- **Alternatives Considered:** Other options that were evaluated
- **References:** Links to relevant documentation or implementations

## Process

1. When an important architectural decision needs to be made, create a new ADR file
2. Use sequential numbering: `NNNN-short-title.md`
3. Fill out all sections using the template (`0000-template.md`)
4. Submit the ADR as part of the pull request proposing the change
5. ADRs should be reviewed and approved before implementation

## ADRs

- [ADR 0001: Migrate from Oracle Container Instances to Oracle VMs](./0001-migrate-from-oracle-container-instances-to-vms.md)
- [ADR 0002: 32-bit vs 64-bit SRCDS Images](./0002-32bit-vs-64bit-srcds-images.md)

## References

- [Architecture Decision Records](https://adr.github.io/)
- [Markdown Architecture Decision Records (MADR)](https://adr.github.io/madr/)
- [Architecture Decision Records by Michael Nygard](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
