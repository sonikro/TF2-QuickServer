#!/bin/bash
# Root entrypoint wrapper - runs as root to perform privileged operations,
# then drops to tf2 user for the main application.

echo "Running root entrypoint..."

# Set MTU on all network interfaces to reduce UDP fragmentation.
# OCI may drop fragmented UDP packets; lowering MTU helps avoid this issue.
# This must run as root because NET_ADMIN capability requires effective root.
MTU="${MTU:-1400}"
if command -v ip &> /dev/null; then
    for iface in $(ip -o link show | awk -F': ' '{print $2}' | grep -v '^lo$'); do
        # Strip the @ifXX suffix from veth interface names (e.g., eth0@if21 -> eth0)
        iface_clean="${iface%%@*}"
        if ip link set dev "$iface_clean" mtu "$MTU" 2>/dev/null; then
            echo "Set MTU to $MTU on $iface_clean"
        else
            echo "Warning: Failed to set MTU on $iface_clean"
        fi
    done
else
    echo "Warning: 'ip' command not found, skipping MTU configuration"
fi

# The host kernel, LSM and seccomp settings are outside our control and have
# broken server startup before (ADR 0002, ADR 0004). Log them once per start so
# a crash can be diagnosed from the container log alone.
log_diagnostics() {
    local server_dir="$1"
    echo "=== Container diagnostics ==="
    echo "date: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "hostname: $(hostname)"
    echo "kernel: $(uname -r) ($(uname -m))"
    echo "cpu: $(grep -m1 'model name' /proc/cpuinfo 2>/dev/null | sed 's/.*: //') x$(nproc 2>/dev/null)"
    echo "selinux label: $(tr -d '\0' < /proc/self/attr/current 2>/dev/null || echo unknown)"
    echo "selinux enforce: $(cat /sys/fs/selinux/enforce 2>/dev/null || echo not-visible)"
    echo "capabilities: $(awk '/^CapEff/ {print $2}' /proc/self/status 2>/dev/null)"
    echo "seccomp: $(awk '/^Seccomp:/ {print $2}' /proc/self/status 2>/dev/null)"
    echo "aslr: $(cat /proc/sys/kernel/randomize_va_space 2>/dev/null)"
    echo "max_map_count: $(cat /proc/sys/vm/max_map_count 2>/dev/null)"
    echo "core_pattern: $(cat /proc/sys/kernel/core_pattern 2>/dev/null)"
    echo "core_limit: $(ulimit -c)"
    echo "cgroup: $(head -1 /proc/self/cgroup 2>/dev/null)"
    echo "tf2_version: $(grep -m1 '^ServerVersion=' "$server_dir/tf/steam.inf" 2>/dev/null | cut -d= -f2)"
    echo "metamod_sha256: $(sha256sum "$server_dir/tf/addons/metamod/bin/server.so" 2>/dev/null | cut -d' ' -f1)"
    echo "sourcemod_sha256: $(sha256sum "$server_dir/tf/addons/sourcemod/bin/sourcemod_mm_i486.so" 2>/dev/null | cut -d' ' -f1)"
}

log_diagnostics "$SERVER_DIR"

# Drop privileges and run the custom entrypoint as the tf2 user
exec su -s /bin/bash tf2 -c "cd $SERVER_DIR && ./custom_entrypoint.sh $*"
