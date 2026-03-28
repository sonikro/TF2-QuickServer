---
name: sourcepawn-compile
description: "Compile SourcePawn (.sp) plugins with spcomp in this TF2 QuickServer dev container. Use when building/testing SourceMod scripts, fixing include-path errors, locating generated .smx files, or resolving 32-bit runtime dependency issues for spcomp."
argument-hint: "Source file path, optional output file name"
---

# SourcePawn Compile

## When To Use
- Compile a SourceMod plugin from a `.sp` source file.
- Reproduce compile errors in CI-like local workflow.
- Resolve container-specific `spcomp` execution issues.

## Environment Defaults
- Compiler binary: `/home/node/sourcemodAPI/addons/sourcemod/scripting/spcomp`
- Include path: `/home/node/sourcemodAPI/addons/sourcemod/scripting/include/`
- Repository root: `/workspaces/TF2-QuickServer`
- Required output folder: `variants/base/tf/addons/sourcemod/plugins`

## Standard Compile Command
```bash
/home/node/sourcemodAPI/addons/sourcemod/scripting/spcomp \
  variants/base/tf/addons/sourcemod/scripting/delay_exec.sp \
  -i /home/node/sourcemodAPI/addons/sourcemod/scripting/include/
```

## Recommended Workflow
1. Run the standard compile command with the target `.sp` path.
2. Always set `-o` to the SourceMod plugins folder.
3. Confirm the generated `.smx` exists in the plugins folder.

Example with explicit output:
```bash
/home/node/sourcemodAPI/addons/sourcemod/scripting/spcomp \
  variants/base/tf/addons/sourcemod/scripting/delay_exec.sp \
  -i /home/node/sourcemodAPI/addons/sourcemod/scripting/include/ \
  -o variants/base/tf/addons/sourcemod/plugins/delay_exec.smx
```

## Helper Script
Use [compile-sourcepawn.sh](./scripts/compile-sourcepawn.sh) for a reusable wrapper:

```bash
./.github/skills/sourcepawn-compile/scripts/compile-sourcepawn.sh \
  variants/base/tf/addons/sourcemod/scripting/delay_exec.sp
```

The wrapper always writes output to:

`variants/base/tf/addons/sourcemod/plugins/<plugin-name>.smx`

With explicit output file name (still inside plugins folder):
```bash
./.github/skills/sourcepawn-compile/scripts/compile-sourcepawn.sh \
  variants/base/tf/addons/sourcemod/scripting/delay_exec.sp \
  delay_exec.smx
```

## Troubleshooting
If `spcomp` fails to run with exit code `127`, see [troubleshooting.md](./references/troubleshooting.md).
