package config

import (
	"os"
	"strconv"
)

// GetIface returns the network interface name from the IFACE environment variable, or "eth0" if not set.
func GetIface() string {
	iface := os.Getenv("IFACE")
	if iface == "" {
		iface = "eth0"
	}
	return iface
}

// GetMaxBytes returns the max bytes from the MAXBYTES environment variable, or 100000000 if not set or invalid.
func GetMaxBytes() uint64 {
	maxBytes := uint64(100000000)
	if mbStr := os.Getenv("MAXBYTES"); mbStr != "" {
		if mb, err := strconv.ParseUint(mbStr, 10, 64); err == nil {
			maxBytes = mb
		}
	}
	return maxBytes
}
