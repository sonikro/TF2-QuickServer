package config_test

import (
	"net"
	"os"
	"testing"

	"github.com/sonikro/tf2-quickserver-shield/pkg/config"
)

func TestGetIface(t *testing.T) {
	tests := []struct {
		name      string
		envIface  string
		ifaces    []net.Interface
		ifaceErr  error
		expect    string
		expectErr bool
	}{
		{
			name:   "Detects non-loopback interface",
			ifaces: []net.Interface{{Name: "lo", Flags: net.FlagLoopback | net.FlagUp}, {Name: "eth99", Flags: net.FlagUp}},
			expect: "eth99",
		},
		{
			name:      "Only loopback interface returns error",
			ifaces:    []net.Interface{{Name: "lo", Flags: net.FlagLoopback | net.FlagUp}},
			expect:    "",
			expectErr: true,
		},
		{
			name:      "Error fetching interfaces returns error",
			ifaceErr:  os.ErrNotExist,
			expect:    "",
			expectErr: true,
		},
		{
			name:     "IFACE env var is set",
			envIface: "lo",
			expect:   "lo",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.envIface != "" {
				os.Setenv("IFACE", tt.envIface)
			} else {
				os.Unsetenv("IFACE")
			}
			iface, err := config.GetIface(func() ([]net.Interface, error) {
				return tt.ifaces, tt.ifaceErr
			})
			if tt.expectErr && err == nil {
				t.Errorf("expected error, got nil")
			}
			if !tt.expectErr && err != nil {
				t.Errorf("unexpected error: %v", err)
			}
			if iface != tt.expect {
				t.Errorf("expected iface '%s', got '%s'", tt.expect, iface)
			}
		})
	}
}

func TestGetMaxBytes(t *testing.T) {
	os.Unsetenv("MAXBYTES")
	if got := config.GetMaxBytes(); got != 100000000 {
		t.Errorf("expected default max bytes 100000000, got %d", got)
	}

	os.Setenv("MAXBYTES", "123456")
	if got := config.GetMaxBytes(); got != 123456 {
		t.Errorf("expected max bytes 123456, got %d", got)
	}

	os.Setenv("MAXBYTES", "notanumber")
	if got := config.GetMaxBytes(); got != 100000000 {
		t.Errorf("expected fallback to default on invalid input, got %d", got)
	}
}
