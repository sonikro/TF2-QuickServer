#!/bin/bash
set -e

echo "==> Disabling unnecessary services and background processes..."

# Disable and stop unnecessary system services
SERVICES_TO_DISABLE=(
    "apport"                      # Ubuntu error reporting
    "apport-autoreport.service"   # Automatic error reporting
    "bluetooth"                   # Bluetooth (not needed for game server)
    "iscsid"                      # iSCSI target discovery (not needed)
    "open-iscsi"                  # iSCSI (not needed)
    "snapd"                       # Snap daemon (resource hog)
    "snapd.socket"                # Snap socket
    "snapd.seeded"                # Snap seeded service
    "systemd-resolved"            # Use faster DNS or disable
    "avahi-daemon"                # mDNS/Bonjour (not needed)
    "cups"                        # Printing daemon (not needed)
    "cups-browsed"                # Cups browser
    "modemmanager"                # Modem management (not needed)
    "rsyslog"                     # We'll use journald instead
    "unattended-upgrades"         # Already disabled in packer template
    "apt-daily"                   # Automatic apt updates
    "apt-daily.service"           # Automatic apt updates
    "apt-daily-upgrade"           # Automatic apt upgrades
    "apt-daily-upgrade.service"   # Automatic apt upgrades
    "fwupd"                       # Firmware updates (not needed in cloud)
    "fwupd-refresh"               # Firmware refresh service
    "motd-news"                   # MOTD news service
    "e2scrub_all"                 # Ext4 filesystem scrubbing
    "man-db"                      # Manual page indexing
    "needrestart"                 # Check for service restarts
)

for service in "${SERVICES_TO_DISABLE[@]}"; do
    if systemctl is-enabled "$service" &> /dev/null || systemctl is-active "$service" &> /dev/null; then
        echo "  - Disabling $service"
        sudo systemctl disable "$service" 2>/dev/null || true
        sudo systemctl stop "$service" 2>/dev/null || true
    fi
done

# Mask services that might be auto-started by dependencies
SERVICES_TO_MASK=(
    "snapd"
    "snapd.socket"
    "apt-daily"
    "apt-daily.service"
    "apt-daily-upgrade"
    "apt-daily-upgrade.service"
    "fwupd"
    "fwupd-refresh"
    "needrestart"
)

for service in "${SERVICES_TO_MASK[@]}"; do
    if systemctl is-enabled "$service" &> /dev/null || systemctl is-active "$service" &> /dev/null; then
        echo "  - Masking $service"
        sudo systemctl mask "$service" 2>/dev/null || true
    fi
done

echo "==> Disabling unnecessary packages..."

# Remove packages that consume resources
PACKAGES_TO_REMOVE=(
    "ubuntu-report"      # Ubuntu system reporting
    "popularity-contest" # Popularity contest daemon
    "needrestart"        # Service restart checks
    "apt-listchanges"    # Debian changelog viewer
    "laptop-detect"      # Laptop hardware detection
    "os-prober"          # OS detection (not needed in cloud)
)

for package in "${PACKAGES_TO_REMOVE[@]}"; do
    if dpkg -l | grep -q "^ii  $package"; then
        echo "  - Removing $package"
        sudo apt-get remove -y "$package" 2>/dev/null || true
    fi
done

echo "==> Optimizing kernel parameters..."

# Create sysctl configuration for server optimization
sudo tee /etc/sysctl.d/99-tf2-server-optimize.conf > /dev/null << 'EOF'
# Disable unnecessary kernel features
kernel.printk = 4 4 1 7
kernel.unprivileged_userns_clone = 0

# Reduce CPU overhead from frequent timer interrupts
kernel.sched_migration_cost_ns = 5000000

# Disable unnecessary CPU features that consume power
kernel.sched_autogroup_enabled = 0
EOF

sudo sysctl -p /etc/sysctl.d/99-tf2-server-optimize.conf > /dev/null

echo "==> Configuring systemd to be minimal..."

# Optimize systemd journal to reduce disk I/O
sudo tee /etc/systemd/journald.conf.d/99-optimize.conf > /dev/null << 'EOF'
[Journal]
Storage=persistent
Compress=yes
SystemMaxUse=100M
ForwardToSyslog=no
ForwardToConsole=no
ForwardToWall=no
RateLimitIntervalSec=0
RateLimitBurst=0
EOF

sudo systemctl daemon-reload

echo "==> Disabling swap to prevent stutter..."

# Disable swappiness to avoid latency from swap I/O
sudo sysctl -w vm.swappiness=0

# Make it persistent
echo "vm.swappiness=0" | sudo tee -a /etc/sysctl.d/99-tf2-server-optimize.conf > /dev/null

# Disable any swap that might be configured
sudo swapoff -a 2>/dev/null || true

echo "==> Removing cloud-init modules that aren't needed..."

# Disable cloud-init stages that consume resources
sudo tee /etc/cloud/cloud.cfg.d/99-disable-network-config.cfg > /dev/null << 'EOF'
network:
  config: disabled
EOF

# Create a minimal cloud-init config
sudo tee /etc/cloud/cloud.cfg.d/99-minimize-cloud-init.cfg > /dev/null << 'EOF'
cloud_init_modules:
  - seed_random
  - bootcmd
  - write_files
  - write-files

cloud_config_modules:
  - emit_upstart
  - locale
  - timezone

cloud_final_modules:
  - final-message
EOF

echo "==> Service optimization complete!"
