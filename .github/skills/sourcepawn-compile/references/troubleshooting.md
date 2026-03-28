# Troubleshooting SourcePawn Compile

## Symptom: spcomp exits with code 127

Typical cause in this container: missing 32-bit runtime dependencies required by `spcomp`.

Install required packages:

```bash
sudo dpkg --add-architecture i386
sudo apt-get update
sudo apt-get install -y libc6:i386 libstdc++6:i386
```

If `sudo` is unavailable, run the same commands as root.

## Symptom: include file not found

Make sure compile command includes:

```bash
-i /home/node/sourcemodAPI/addons/sourcemod/scripting/include/
```

## Symptom: .smx not where expected

The project convention for this skill is to always output to `variants/base/tf/addons/sourcemod/plugins`.

If compiling manually, set `-o` explicitly.

Example:

```bash
/home/node/sourcemodAPI/addons/sourcemod/scripting/spcomp <source.sp> \
  -i /home/node/sourcemodAPI/addons/sourcemod/scripting/include/ \
  -o variants/base/tf/addons/sourcemod/plugins/<name>.smx
```

If using the skill helper script, output is automatically written to the plugins folder.
