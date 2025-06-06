package shield

import (
	"sync/atomic"
	"testing"
	"time"

	"github.com/gorcon/rcon"
	"github.com/sonikro/tf2-quickserver-shield/pkg/srcds"
)

type mockConn struct {
	execFunc func(cmd string) (string, error)
	closed   atomic.Bool
}

func (m *mockConn) Execute(cmd string) (string, error) {
	return m.execFunc(cmd)
}
func (m *mockConn) Close() error {
	m.closed.Store(true)
	return nil
}
func TestShield_OnAttackDetected(t *testing.T) {
	var ipsToProtect []string
	var firewallDisabled atomic.Bool
	shield := &Shield{
		RconDial: func(address, password string, options ...rcon.Option) (srcds.RconConnection, error) {
			return &mockConn{
				execFunc: func(cmd string) (string, error) {
					if cmd == "status" {
						return "#      3 \"player1\"           [U:1:111111]      00:20       60    0 active 169.254.249.16:18930", nil
					}
					if cmd == "say 'Server is being attacked. Activating DDoS shield for 3 minutes'" {
						return "", nil
					}
					if cmd == "say 'DDoS shield activated for 3 minutes.'" {
						return "", nil
					}
					return "", nil
				},
				closed: atomic.Bool{},
			}, nil
		},
		SrcdsSettings: srcds.SrcdsSettings{Ip: "127.0.0.1", Port: "27015", Password: "pw"},
		EnableFirewallRestriction: func(ips []string) error {
			ipsToProtect = ips
			return nil
		},
		DisableFirewallRestriction: func() error {
			firewallDisabled.Store(true)
			return nil
		},
		ShieldDuration: 10 * time.Millisecond, // short duration for test
	}

	shield.OnAttackDetected("eth0", 1234)

	if !shield.enabled.Load() {
		t.Errorf("expected shield to be enabled after attack detected")
	}

	if len(ipsToProtect) == 0 {
		t.Errorf("expected player IPs to be protected, but got none")
	}

	for _, ip := range ipsToProtect {
		if ip != "169.254.249.16" {
			t.Errorf("expected player IP 169.254.249.16 but got %s", ip)
		}
	}
	time.Sleep(20 * time.Millisecond) // allow disable goroutine to run

	if shield.enabled.Load() {
		t.Errorf("expected shield to be disabled after timer")
	}

	if !firewallDisabled.Load() {
		t.Errorf("expected firewall restriction to be disabled after timer")
	}

}
