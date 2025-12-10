# ADR 0001: Migrate from Oracle Container Instances to Oracle VMs

**Status:** Pending Tests

**Date:** 2025-12-08

## Context

TF2 QuickServer was initially deployed using Oracle Container Instances to host TF2 game servers. However, during deployment, it became clear that certain critical extensions could not function properly within this environment.

The primary issue was that Oracle Container Instances run on a fixed base OS (Oracle Linux) with enforced SELinux security policies that could not be modified. These constraints prevented extensions like TFTrue and SrcTV+ from operating correctly, as their Function Hooking mechanisms were blocked by the kernel-level security policies and the incompatibility with the Oracle Linux distribution.

Testing confirmed that the same Docker image running successfully on Ubuntu environments failed to work properly on Oracle Container Instances, making this a blocker for supporting the required TF2 server extensions.

## Decision

We decided to migrate from Oracle Container Instances to Oracle VMs with Ubuntu 22.04 Minimal as the base image. The VM infrastructure continues to leverage Docker for containerization and server execution, with a key optimization: pre-loaded Docker images included in the base VM image to reduce startup times.

### Implementation Details

- Base VM images are built using Packer with Ubuntu 22.04 Minimal, Docker, and pre-loaded TF2 server Docker images
- Base images are created and maintained per region
- The OracleVMManager creates VMs from these pre-configured images
- Docker Compose specifications are passed during VM startup for automatic server initialization
- The image publishing workflow was updated to rebuild VM images whenever Docker images are published

## Consequences

### Positive (Theoretical)

- **Extension Support:** TFTrue and SrcTV+ extensions work correctly since we control the kernel and SELinux policies
- **Full Control:** Complete control over the base OS and security policies enables proper configuration for TF2 server requirements
- **Observability:** SHIELD firewall and NewRelic agent integration work as intended

### Negative (Observed During Testing)

- **Performance Degradation:** 1OCPU and 4-core VMs cause lag spikes and stutters on the server due to resource contention. Resources are no longer dedicated to containers but shared with all other VM processes, introducing additional overhead
- **Fixed Infrastructure Cost:** Maintaining one Custom Image per region results in approximately 3.5 USD per month per region. With 6 Oracle regions, this forces a fixed infrastructure cost exceeding 21 USD per month regardless of actual usage
- **Increased Pipeline Duration:** Publishing new images takes longer because we must rebuild both Docker images and VM images
- **Image Management Complexity:** Additional responsibility to manage, version, and clean up base VM images across regions
- **Maintenance Burden:** Requires coordination between Docker image updates and VM base image rebuilds

### Identified Issues to Resolve

- **Cost:** Fixed monthly cost of over 21 USD per region for maintaining custom VM images
- **Performance:** VM process overhead degrades server performance, causing lag spikes and stutters due to resource contention

## Alternatives Considered

- **Continue with Oracle Container Instances:** Rejected because the kernel and SELinux policy constraints could not be worked around, preventing critical extensions from functioning
- **Use Alternative Cloud Providers:** Considered but rejected because the cost of Compute in Oracle Cloud is so good that it justifies staying within the Oracle Cloud ecosystem
- **Run Servers Outside Containers:** Rejected because Docker provides consistency, isolation, and deployment efficiency critical to the infrastructure


## References

- OracleVMManager implementation: `packages/providers/src/cloud-providers/oracle/OracleVMManager.ts`
- Packer configuration: `packer/` directory
- Image publishing workflow: `.github/workflows/` (publish-variant workflow)
- Related issues with TFTrue and SrcTV+ extensions requiring Function Hooking support
