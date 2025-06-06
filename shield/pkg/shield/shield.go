package shield

import (
	"fmt"
	"sync/atomic"
	"time"

	"github.com/sonikro/tf2-quickserver-shield/pkg/srcds"
)

type Shield struct {
	SrcdsSettings              srcds.SrcdsSettings
	RconDial                   srcds.RconClient
	EnableFirewallRestriction  func(playerIps []string) error
	DisableFirewallRestriction func() error
	enabled                    atomic.Bool
	ShieldDuration             time.Duration // Duration for which the shield is active
}

func (s *Shield) OnAttackDetected(iface string, bytes uint64) {
	if s.enabled.Load() {
		// Already enabled, skip
		return
	}
	println("Attack detected on interface", iface, "with", bytes, "bytes")

	// Enable the DDoS shield
	println("Activating DDoS shield...")
	conn, err := s.RconDial(fmt.Sprintf("%s:%s", s.SrcdsSettings.Ip, s.SrcdsSettings.Port), s.SrcdsSettings.Password)
	if err != nil {
		println("Failed to connect to RCON:", err.Error())
		return
	}
	defer conn.Close()

	_, err = conn.Execute("say 'Server is being attacked. Activating DDoS shield for 3 minutes'")
	if err != nil {
		println("Failed to execute RCON command:", err.Error())
		return
	}

	// Enable the shield
	playerIps, err := srcds.GetPlayerIPs(conn.Execute)
	if err != nil {
		println("Failed to get player IPs:", err.Error())
		return
	}
	if len(playerIps) == 0 {
		println("No player IPs found, cannot enable firewall restriction")
		return
	}
	println("Enabling firewall restriction for player IPs:", playerIps)
	if err := s.EnableFirewallRestriction(playerIps); err != nil {
		println("Failed to enable firewall restriction:", err.Error())
		return
	}
	println("Firewall restriction enabled for player IPs, shield activated.")

	_, err = conn.Execute("say 'DDoS shield activated for 3 minutes.'")
	if err != nil {
		println("Failed to execute RCON command:", err.Error())
		return
	}
	s.enabled.Store(true)

	// Start timer to disable after 3 minutes
	go func() {
		timer := time.NewTimer(s.ShieldDuration)
		<-timer.C
		s.disable()
	}()

}

// disable is called after the shield duration has elapsed.
func (s *Shield) disable() {
	err := s.DisableFirewallRestriction()
	if err != nil {
		println("Failed to disable firewall restriction:", err.Error())
		return
	}
	conn, err := s.RconDial(fmt.Sprintf("%s:%s", s.SrcdsSettings.Ip, s.SrcdsSettings.Port), s.SrcdsSettings.Password)
	if err != nil {
		println("Failed to connect to RCON:", err.Error())
		return
	}
	defer conn.Close()
	_, err = conn.Execute("say 'DDoS shield deactivated'")
	if err != nil {
		println("Failed to execute RCON command:", err.Error())
		return
	}
	println("Firewall restriction disabled, DDoS shield deactivated.")
	// Reset the state
	s.enabled.Store(false)
}
