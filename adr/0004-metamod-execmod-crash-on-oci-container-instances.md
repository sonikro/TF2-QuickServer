# ADR 0004: MetaMod Must Not Request PROT_EXEC When Patching Its Vtable

**Status:** Accepted

**Date:** 2026-11-19

## Context

On 2026-11-19 newly created Oracle game servers started dying a few seconds
after boot:

```
ProtoDefs post data loaded.
ProtoDefs loaded. 23.67 MB used
ProtoDefs post data loaded.
ProtoDefs loaded. 23.67 MB used
Segmentation fault (core dumped)
```

Nothing in our images had changed (last publish 2026-11-02, TF2 `11191711`), and
the same image started normally on a developer machine and on some freshly
created container instances. On the instances that failed, the host looked like
this from inside the container:

| Observation | Value |
|---|---|
| Kernel | `6.12.0-207.111.5.6.el9uek.container`, built 2026-10-22 |
| Shape | `CI.Standard.E4.Flex`, AMD EPYC 7J13 |
| SELinux label | `container_t`, enforcing on the host |
| Seccomp | disabled (`Seccomp: 0`) |

Bisecting on a failing host isolated the crash to MetaMod:Source:

| Addons present | Runs | Result |
|---|---|---|
| MetaMod + SourceMod | 5 | 5 × SIGSEGV |
| MetaMod only | 4 | 4 × SIGSEGV |
| No addons | 3 | 3 × map load OK |

`gdb` puts the fault in `ServerPlugin::Load()` of
`tf/addons/metamod/bin/server.so`, at the `mov %eax,0x40(%esi)` that installs
MetaMod's `ClientCommand` thunk in its own `IServerPluginCallbacks` vtable.
`strace` shows the operation immediately before it:

```
mprotect(0xef018000, 3824, PROT_READ|PROT_WRITE|PROT_EXEC) = -1 EACCES
```

MetaMod raises the access on the RELRO page that holds the vtable, and asks for
`PROT_EXEC` even though the page only contains function pointers (execution
happens at the address the pointer refers to, and that code page is already
executable). SELinux denies adding `PROT_EXEC` to a writable private file
mapping (`execmod`), MetaMod ignores the failed call and writes anyway, which
faults. The same four call sites exist in every 1.12 build, including
`1.12.0-git1230` and the 2.0 line (`loader/serverplugin.cpp` and
`loader/gamedll.cpp`, through `SourceHook::SetMemAccess` /
`KHook::Memory::SetAccess`), so upgrading MetaMod does not remove the need for
`execmod`.

An initial hypothesis was that `1.12.0-git1230` was compatible and
`1.12.0-git1219` was not. A same-instance A/B refuted it: on a permissive host
both builds start, and both builds issue the same `mprotect(..., RWX)` call. The
one run where git1230 appeared to fix a failing host was host variance, not a
version difference.

The denial is not stable across hosts. Between roughly 00:25 and 01:20 UTC
freshly created instances reproduced it consistently in `sa-saopaulo-1`,
`us-chicago-1` and `sa-santiago-1` (both tenancies); from about 01:50 UTC new
instances started the unchanged `git1219` image successfully, and at about
02:39 UTC it came back in `sa-saopaulo-1`. The host-side change is being rolled
out or reverted unevenly by Oracle, which is also what happened in the December
2025 incident recorded in ADR 0002.

## Decision

Make the images independent of the host's `execmod` policy instead of waiting
for the host to be stable:

1. `variants/base/patch_metamod.sh` rewrites the four `mprotect` call sites in
   MetaMod's `server.so` from `PROT_READ|PROT_WRITE|PROT_EXEC` to
   `PROT_READ|PROT_WRITE`. The page only holds pointers, so read-write is
   enough, and read-write on a private file mapping is not an `execmod`
   operation. The script fails the build when it cannot find, or cannot clear,
   the call sites, so a future MetaMod build cannot silently bypass it.
2. `variants/base/root_entrypoint.sh` logs the facts that were missing during
   this investigation at every container start: host kernel, CPU, SELinux label
   and enforcement state, capabilities, seccomp, ASLR, `max_map_count`,
   `core_pattern`, core limit, cgroup, TF2 version and the MetaMod/SourceMod
   binary hashes.

All three Dockerfiles that install MetaMod
(`fat-standard-competitive-i386`, `fat-casual-i386`, `fat-mge-tf`) run the patch
after copying the addons; `fat-tf2pickup` and `fat-tf2center` inherit it from
the standard competitive image. The MetaMod pin stays on
`1.12.0-git1219`.

## Consequences

### Positive

- Servers no longer depend on a host policy we do not control, and a repeat of
  the denial cannot take down every new server.
- The change matches what an upstream fix would do: `PROT_EXEC` on that page was
  never needed.
- Every container now records the host and game facts needed to diagnose the
  next incident from its own log.

### Negative

- The images patch a third-party binary at build time. The script is pinned to
  MetaMod's current code generation and fails the build when the pattern
  changes, so a MetaMod bump requires re-verifying the patch.
- The build-time patch has to be re-checked whenever the MetaMod pin moves,
  because it targets the code generation of the pinned build. The script fails
  the build when the call sites are not found, which makes the move visible.

### Neutral

- The `amd64` variant is still removed (#324). Its published image is stale
  (TF2 `10809195`, no `~/.steam/steamcmd` so it cannot self-update) and would
  need the same patch, plus a MetaMod/SourceMod rebuild, if it is ever restored.

## Alternatives Considered

- **Upgrade MetaMod to 1.12.0-git1230.** Refuted as a fix: the same
  `mprotect(..., RWX)` call sites exist in that build.
- **Wait for Oracle to revert the host change.** Rejected as the only response:
  it happened in December 2025 and happened again here, and every new server is
  down until it is reverted.
- **Disable MetaMod/SourceMod.** Rejected: loses every competitive plugin.
- **Move OCI regions to 64-bit images.** Rejected: the 64-bit image crashes at
  the same point and the variant no longer exists.
- **Link MetaMod with `-z norelro`, or binary-patch the RELRO program header.**
  Rejected: they rely on MetaMod ignoring the failed `mprotect` and leave the
  page writable forever, which is more fragile than asking for the access the
  code actually needs.

## Verification

- Crash reproduced on freshly created container instances in `sa-saopaulo-1`,
  `us-chicago-1` and `sa-santiago-1` with the published `:latest` image, and not
  on a local Docker host or on container instances created after the host
  reverted the change.
- `strace` shows `mprotect(...) = -1 EACCES` on the vtable page immediately
  before the fault; `gdb` shows the fault at `ServerPlugin::Load()+200`.
- The patch changes exactly those call sites: `push $0x7` becomes `push $0x3`
  at `0x2ce6`, `0x2d6b` and the two `mm_GameDllRequest` sites, and the build
  script asserts that no `RWX` site remains.
- On 2026-11-19 at 02:44 UTC, while the denial was active again in
  `sa-saopaulo-1`, one container instance ran both images on the same host: the
  patched image reached `[META] Loaded 1 plugin.` and
  `Started map "cp_process_f12"` and loaded its SourceMod plugins, while the
  unpatched `:latest` image on that host faulted right after its second
  `ProtoDefs loaded` at 02:48:18. That is the same-host A/B that separates the
  patch from host variance.

## References

- ADR 0002: previous host-side breakage of 32-bit SRCDS on OCI (December 2025)
- MetaMod:Source 1.12 `loader/serverplugin.cpp` and `loader/gamedll.cpp`
- SourceHook `SH_MEM_*` to `PROT_*` mapping: `core/sourcehook/sh_memory.h`
- SELinux `file:execmod`: <https://selinuxproject.org/page/ObjectClassesPerms>
- Patch sites: `variants/base/patch_metamod.sh`
- Diagnostics: `variants/base/root_entrypoint.sh`
