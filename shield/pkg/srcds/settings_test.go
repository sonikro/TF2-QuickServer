package srcds

import (
	"os"
	"testing"
)

func TestNewSrcdsSettingsFromEnv_AllSet(t *testing.T) {
	os.Setenv("SRCDS_IP", "192.168.1.100")
	os.Setenv("SRCDS_PORT", "28015")
	os.Setenv("SRCDS_PASSWORD", "testpass")
	s := NewSrcdsSettingsFromEnv()
	if s.Ip != "192.168.1.100" {
		t.Errorf("expected Ip to be '192.168.1.100', got '%s'", s.Ip)
	}
	if s.Port != "28015" {
		t.Errorf("expected Port to be '28015', got '%s'", s.Port)
	}
	if s.Password != "testpass" {
		t.Errorf("expected Password to be 'testpass', got '%s'", s.Password)
	}
}

func TestNewSrcdsSettingsFromEnv_Defaults(t *testing.T) {
	os.Unsetenv("SRCDS_IP")
	os.Unsetenv("SRCDS_PORT")
	os.Setenv("SRCDS_PASSWORD", "defaultpass")
	s := NewSrcdsSettingsFromEnv()
	if s.Ip != "127.0.0.1" {
		t.Errorf("expected Ip to be '127.0.0.1', got '%s'", s.Ip)
	}
	if s.Port != "27015" {
		t.Errorf("expected Port to be '27015', got '%s'", s.Port)
	}
	if s.Password != "defaultpass" {
		t.Errorf("expected Password to be 'defaultpass', got '%s'", s.Password)
	}
}

func TestNewSrcdsSettingsFromEnv_MissingPassword(t *testing.T) {
	os.Setenv("SRCDS_IP", "127.0.0.1")
	os.Setenv("SRCDS_PORT", "27015")
	os.Unsetenv("SRCDS_PASSWORD")
	defer func() {
		if r := recover(); r == nil {
			t.Errorf("expected panic when SRCDS_PASSWORD is missing, but did not panic")
		}
	}()
	NewSrcdsSettingsFromEnv()
}
