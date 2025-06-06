package srcds

import (
	"testing"
)

type fakeRconConn struct {
	response string
}

func (f *fakeRconConn) Execute(cmd string) (string, error) {
	return f.response, nil
}

func TestGetPlayerIPs(t *testing.T) {
	exampleStatus := `hostname: TF2-QuickServer | Virginia @ Sonikro Solutions
version : 9543365/24 9543365 secure
udp/ip  : 169.254.173.35:13768  (local: 0.0.0.0:27015)  (public IP from Steam: 44.200.128.3)
steamid : [A:1:1871475725:44792] (90264374594008077)
account : not logged in  (No account specified)
map     : cp_badlands at: 0 x, 0 y, 0 z
tags    : cp
sourcetv:  169.254.173.35:13769, delay 30.0s  (local: 0.0.0.0:27020)
players : 1 humans, 1 bots (25 max)
edicts  : 426 used of 2048 max
# userid name                uniqueid            connected ping loss state  adr
#      2 "TF2-QuickServer TV | Virginia @" BOT                       active
#      3 "player1"           [U:1:111111]      00:20       60    0 active 169.254.249.16:18930
#      3 "player2"           [U:1:232232]      00:20       60    0 active 169.254.249.130:18930`

	fakeConn := &fakeRconConn{response: exampleStatus}
	// Type assertion to *rcon.Conn is not possible, so we need to adapt GetPlayerIPs to accept an interface for real tests.
	// For now, we can test the parsing logic directly:
	ips, err := GetPlayerIPs(fakeConn.Execute)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	expectedIPs := []string{
		"169.254.249.16",
		"169.254.249.130",
	}
	if len(ips) != len(expectedIPs) {
		t.Fatalf("expected %d IPs, got %d", len(expectedIPs), len(ips))
	}
	for i, ip := range ips {
		if ip != expectedIPs[i] {
			t.Errorf("expected IP %s, got %s", expectedIPs[i], ip)
		}
	}
}
