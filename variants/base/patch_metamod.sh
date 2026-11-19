#!/bin/bash
set -e

server_dir="$1"
metamod_binary="${server_dir}/tf/addons/metamod/bin/server.so"
rwx_pattern='\x83\xec\x04\x6a\x07\x50\x51\xe8'
rw_pattern='\x83\xec\x04\x6a\x03\x50\x51\xe8'

if [ ! -f "$metamod_binary" ]; then
    echo "MetaMod binary not found: $metamod_binary" >&2
    exit 1
fi

sites=$(perl -0777 -ne "print scalar(() = /$rwx_pattern/g)" "$metamod_binary")
if [ "$sites" -eq 0 ]; then
    already=$(perl -0777 -ne "print scalar(() = /$rw_pattern/g)" "$metamod_binary")
    if [ "$already" -ge 1 ]; then
        echo "MetaMod already requests read-write access only ($already sites)"
        exit 0
    fi
    echo "No MetaMod mprotect sites found in $metamod_binary" >&2
    exit 1
fi

perl -0777 -i -pe "s/$rwx_pattern/$rw_pattern/g" "$metamod_binary"

remaining=$(perl -0777 -ne "print scalar(() = /$rwx_pattern/g)" "$metamod_binary")
if [ "$remaining" -ne 0 ]; then
    echo "Failed to patch $metamod_binary: $remaining sites still request PROT_EXEC" >&2
    exit 1
fi

echo "Patched $sites MetaMod mprotect calls to request read-write access only"
