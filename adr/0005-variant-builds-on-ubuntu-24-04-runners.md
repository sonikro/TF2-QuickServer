# ADR 0005: Build Variant Images on Ubuntu 24.04 Runners

**Status:** Accepted

**Date:** 2026-11-19

## Context

Every `Publish Variant Images` run since 2026-11-19 fails while installing Team
Fortress 2:

```
#29 2.218 ILocalize::AddFile() failed to load file "public/steambootstrapper_english.txt".
#29 2.218 [  0%] Checking for available update...
#29 2.218 [  0%] Downloading Update...
#29 2.218 [----] !!! Fatal Error: Steamcmd needs to be online to update.	 Please confirm your network connection and try again.
#29 2.218 threadtools.cpp (3294) : Assertion Failed: Illegal termination of worker thread
```

SteamCMD is a 32-bit binary, and the 32-bit glibc that runs it inside the
builder container resolves names and creates sockets through the multiplexed
`socketcall(2)` system call. The last image publish (2026-11-02, TF2
`11191711`) succeeded because `ubuntu-latest` was still Ubuntu 24.04 with Docker
28.0.4. Since then `ubuntu-latest` moved to Ubuntu 26.04 (`Image: ubuntu-26.04`,
version `20261111.196.1`), which pins Docker 29.4.2.

Docker 29.4.2 vendors `moby/profiles/seccomp v0.2.2`, whose default profile
denies `socketcall(2)` as hardening for CVE-2026-31431. The deny was reverted in
`seccomp v0.2.3` (moby/profiles@3c28324, "had much bigger impact on x86 binaries
than anticipated") and shipped in Docker 29.4.3, but the runner image still
pins 29.4.2 (actions/runner-images#14790, open, with fixes pending in
actions/runner-images#15332 and #15205).

The failure is not specific to SteamCMD's own networking: any i386 glibc process
in a container on such a host loses name resolution. Nothing in this repository
changed, the image build is a plain `docker build`, and the same Dockerfiles
build and push fine on a Docker 29.4.3+ host.

Probing both runner labels from a workflow run on 2026-11-19 separates the two
variables:

| Probe | `ubuntu-latest` (26.04.1, Docker 29.4.2) | `ubuntu-24.04` (24.04.5, Docker 28.0.4) |
|---|---|---|
| `docker run --rm i386/debian:bookworm getent hosts client-download.steampowered.com` | exit 2, no output | resolves |
| the same with `--security-opt seccomp=unconfined` | resolves | resolves |
| `docker run --rm steamcmd/steamcmd:ubuntu-22 +login anonymous +quit` | `CreateBoundSocket: failed to create socket, error [no name available] (38)`, `FAILED (No Connection)` | logs in |
| the same with `--security-opt seccomp=unconfined` | logs in | logs in |

`38` is `ENOSYS`: the syscall the sandbox removed, not a network outage. The
same base image digest behaves correctly locally on Docker 29.9.3.

## Decision

Pin the job that builds the variant images to `ubuntu-24.04`
(`.github/workflows/build-variant.yaml`), the newest runner image whose Docker
release still lets i386 containers reach the network.

`variants/base/install_tf2.sh` additionally dumps SteamCMD's `stderr.txt` and
probes DNS plus the SteamCMD download host when all retries fail, so the next
runner-image regression is diagnosable from the job log instead of a bare
"needs to be online".

The other workflows keep `ubuntu-latest`: they run amd64 code and do not build
i386 images.

## Consequences

### Positive

- Variant images can be built and published from CI again, so the release
  pipeline stops depending on a manual local build.
- The pin is one line and is removed by deleting one line when the runner image
  ships a fixed Docker.

### Negative

- `ubuntu-24.04` is now a version we track by hand. When GitHub retires it we
  must either move to `ubuntu-latest` (if its Docker is fixed) or to a newer
  image pinned to a Docker version that allows `socketcall(2)`.
- The variant builds run one Ubuntu release behind `ubuntu-latest`.

### Neutral

- SteamCMD's own self-update plus `app_update` remain the only build-time
  network dependency; they are unchanged by this decision.

## Alternatives Considered

- **Wait for the runner image to be fixed.** Rejected as the whole response: the
  fix has been open since 2026-09-26, and until it lands no image can be
  published. It stays the reason to remove the pin later.
- **Build the images with `RUN --security=unconfined`.** Rejected: it needs the
  builder to allow `security.insecure`, which loosens sandboxing for every build
  step to work around a bad default profile, and it is not expressible on a
  per-step basis for `docker build` without builder configuration.
- **Install Docker 29.4.3+ on the runner before building.** Rejected: it adds a
  package repository and a daemon restart to every build to compensate for a
  pinned toolset, and it can diverge from what the runner image supports.
- **Downgrade the Docker client used by `docker build` only.** Rejected: the
  restrictive profile comes from the daemon, not the client.
- **Install the server from a Steam depot without SteamCMD.** Rejected: there is
  no supported depot downloader for app 232250 in this repository, and `srcds`
  needs SteamCMD's appcache at runtime anyway.

## References

- actions/runner-images#14790: Ubuntu 26.04 Docker 29.4.2 blocks socketcall
- moby/profiles@7158007 (deny) and moby/profiles@3c28324 (revert)
- CVE-2026-31431
- Failing run: <https://github.com/sonikro/TF2-QuickServer/actions/runs/44494652276>
- Last successful publish: <https://github.com/sonikro/TF2-QuickServer/actions/runs/41511821224>
- `.github/workflows/build-variant.yaml`, `variants/base/install_tf2.sh`
