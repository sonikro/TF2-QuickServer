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

# Drop privileges and run the custom entrypoint as the tf2 user
exec su -s /bin/bash tf2 -c "cd $SERVER_DIR && ./custom_entrypoint.sh $*"
