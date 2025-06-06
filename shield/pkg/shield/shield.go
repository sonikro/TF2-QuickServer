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
		fmt.Printf("[Shield] Attack detected on %s (%d bytes), but shield is already enabled. Skipping activation.\n", iface, bytes)
		return
	}
	fmt.Printf("[Shield] Attack detected on interface %s with %d bytes.\n", iface, bytes)

	// Enable the DDoS shield
	fmt.Println("[Shield] Activating DDoS shield...")
	conn, err := s.RconDial(fmt.Sprintf("%s:%s", s.SrcdsSettings.Ip, s.SrcdsSettings.Port), s.SrcdsSettings.Password)
	if err != nil {
		fmt.Printf("[Shield] Failed to connect to RCON: %v\n", err)
		return
	}
	defer conn.Close()

	fmt.Println("[Shield] Sending warning message to server chat...")
	_, err = conn.Execute("say 'Server is being attacked. Activating DDoS shield for 3 minutes'")
	if err != nil {
		fmt.Printf("[Shield] Failed to execute RCON command: %v\n", err)
		return
	}

	fmt.Println("[Shield] Fetching player IPs...")
	playerIps, err := srcds.GetPlayerIPs(conn.Execute)
	if err != nil {
		fmt.Printf("[Shield] Failed to get player IPs: %v\n", err)
		return
	}
	if len(playerIps) == 0 {
		fmt.Println("[Shield] No player IPs found, cannot enable firewall restriction")
		return
	}
	fmt.Printf("[Shield] Enabling firewall restriction for player IPs: %v\n", playerIps)
	if err := s.EnableFirewallRestriction(playerIps); err != nil {
		fmt.Printf("[Shield] Failed to enable firewall restriction: %v\n", err)
		return
	}
	fmt.Println("[Shield] Firewall restriction enabled for player IPs, shield activated.")

	fmt.Println("[Shield] Notifying server: DDoS shield activated.")
	_, err = conn.Execute("say 'DDoS shield activated for 3 minutes.'")
	if err != nil {
		fmt.Printf("[Shield] Failed to execute RCON command: %v\n", err)
		return
	}
	s.enabled.Store(true)

	fmt.Printf("[Shield] Shield timer started for %s.\n", s.ShieldDuration)
	// Start timer to disable after 3 minutes
	go func() {
		timer := time.NewTimer(s.ShieldDuration)
		<-timer.C
		fmt.Println("[Shield] Shield duration elapsed, disabling shield...")
		s.disable()
	}()
}

// disable is called after the shield duration has elapsed.
func (s *Shield) disable() {
	fmt.Println("[Shield] Disabling firewall restriction...")
	err := s.DisableFirewallRestriction()
	if err != nil {
		fmt.Printf("[Shield] Failed to disable firewall restriction: %v\n", err)
		return
	}
	fmt.Println("[Shield] Connecting to RCON to notify server of shield deactivation...")
	conn, err := s.RconDial(fmt.Sprintf("%s:%s", s.SrcdsSettings.Ip, s.SrcdsSettings.Port), s.SrcdsSettings.Password)
	if err != nil {
		fmt.Printf("[Shield] Failed to connect to RCON: %v\n", err)
		return
	}
	defer conn.Close()
	_, err = conn.Execute("say 'DDoS shield deactivated'")
	if err != nil {
		fmt.Printf("[Shield] Failed to execute RCON command: %v\n", err)
		return
	}
	fmt.Println("[Shield] Firewall restriction disabled, DDoS shield deactivated.")
	// Reset the state
	s.enabled.Store(false)
}
