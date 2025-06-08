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
#      4 "player2"           [U:1:232232]      00:20       60    0 active 169.254.249.130:18930`

	exampleTVClients := `ID, Name, Connected, Address, SteamID, Rate, Delay, Loss, Uptime, Comment
ID, 1, 00:10, 169.254.100.50:27020, STEAM_1:1:123456, 10000, 0, 0, 00:10, TV client 1
ID, 2, 00:12, 169.254.100.51:27020, STEAM_1:1:654321, 10000, 0, 0, 00:12, TV client 2`

	execute := func(cmd string) (string, error) {
		if cmd == "status" {
			return exampleStatus, nil
		}
		if cmd == "tv_clients" {
			return exampleTVClients, nil
		}
		return "", nil
	}

	ips, err := GetPlayerIPs(execute)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	expectedIPs := []string{
		"169.254.249.16",
		"169.254.249.130",
		"169.254.100.50",
		"169.254.100.51",
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
