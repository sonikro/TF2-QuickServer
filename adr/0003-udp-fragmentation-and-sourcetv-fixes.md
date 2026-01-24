# ADR 0003: UDP Fragmentation and SourceTV Fixes for OCI

**Status:** Experimental

**Date:** 2026-01-24

## Context

SourceTV spectators are being unexpectedly kicked from TF2 servers running on Oracle Cloud Infrastructure (OCI) Container Instances. The suspected cause is that OCI's Network Security Groups (NSGs) may be dropping fragmented UDP packets when rules are port-specific.

## Decision

We implemented experimental changes to test whether UDP fragmentation handling is the root cause:

1. **NSG "Allow All UDP" Rules:** Added permissive UDP ingress/egress rules without port restrictions to allow any fragmented packets through.

2. **Lower MTU Inside Containers:** Reduced the container's network interface MTU to 1400 bytes to reduce the likelihood of fragmentation occurring.

3. **Container Privileges:** Added NET_ADMIN capability and a root entrypoint wrapper to allow MTU modification at container startup.

These changes are being deployed for testing. No results have been collected yet to confirm whether this resolves the SourceTV disconnection issues.

## Consequences

### Positive

- If successful, SourceTV spectators will no longer be kicked unexpectedly
- Changes are configurable and can be disabled if needed

### Negative

- More permissive NSG rules reduce network-level security
- Containers require additional privileges (NET_ADMIN)
- Added complexity with root entrypoint wrapper

## References

- [Oracle Handling UDP Fragmentation](https://www.ateam-oracle.com/handling-udp-fragmented-packet-in-oci)
