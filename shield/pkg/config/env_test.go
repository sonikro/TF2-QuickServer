package config_test

import (
	"os"
	"testing"

	"github.com/sonikro/tf2-quickserver-shield/pkg/config"
)

func TestGetIface(t *testing.T) {
	os.Unsetenv("IFACE")
	if got := config.GetIface(); got != "eth0" {
		t.Errorf("expected default iface 'eth0', got '%s'", got)
	}

	os.Setenv("IFACE", "lo")
	if got := config.GetIface(); got != "lo" {
		t.Errorf("expected iface 'lo', got '%s'", got)
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
