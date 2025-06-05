package radar_test

import (
	"context"
	"sync/atomic"
	"testing"
	"time"

	"github.com/prometheus/procfs"
	"github.com/sonikro/tf2-quickserver-shield/pkg/radar"
)

type mockProcFs struct {
	NetDevFunc func() (procfs.NetDev, error)
}

func (m *mockProcFs) NetDev() (procfs.NetDev, error) {
	return m.NetDevFunc()
}

// --- TEST ---
func TestAttackRadar_StartMonitoring(t *testing.T) {
	tests := []struct {
		name         string
		mockStats    []procfs.NetDevLine
		maxBytes     uint64
		expectAttack bool
	}{
		{
			name: "attack detected (delta > maxBytes)",
			mockStats: []procfs.NetDevLine{
				{Name: "eth0", RxBytes: 50},
				{Name: "eth0", RxBytes: 200}, // delta = 150
			},
			maxBytes:     100,
			expectAttack: true,
		},
		{
			name: "no attack (delta < maxBytes)",
			mockStats: []procfs.NetDevLine{
				{Name: "eth0", RxBytes: 50},
				{Name: "eth0", RxBytes: 120}, // delta = 70
			},
			maxBytes:     100,
			expectAttack: false,
		},
		{
			name: "attack detected exactly at threshold",
			mockStats: []procfs.NetDevLine{
				{Name: "eth0", RxBytes: 50},
				{Name: "eth0", RxBytes: 150}, // delta = 100
			},
			maxBytes:     100,
			expectAttack: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var attackDetected atomic.Bool
			iface := "eth0"
			var timesCalled int
			procFS := &mockProcFs{
				NetDevFunc: func() (procfs.NetDev, error) {
					defer func() { timesCalled++ }()
					if timesCalled >= len(tt.mockStats) {
						return procfs.NetDev{"eth0": tt.mockStats[len(tt.mockStats)-1]}, nil
					}
					return procfs.NetDev{"eth0": tt.mockStats[timesCalled]}, nil
				},
			}
			procFSFactory := func(_ string) (radar.ProcFS, error) {
				return procFS, nil
			}
			attackChannel := make(chan struct{}, 1)
			onAttack := func(iface string, bytes uint64) {
				attackDetected.Store(true)
				attackChannel <- struct{}{}
			}

			radar := radar.NewAttackRadar(iface, procFSFactory, tt.maxBytes, onAttack)
			ctx, cancel := context.WithCancel(context.Background())
			defer cancel()
			go radar.StartMonitoring(ctx)

			if tt.expectAttack {
				select {
				case <-attackChannel:
					t.Logf("Attack detected as expected")
				case <-time.After(2 * time.Second):
					t.Fatal("Timeout waiting for attack detection")
				}
			} else {
				select {
				case <-attackChannel:
					t.Fatal("Attack detected unexpectedly")
				case <-time.After(500 * time.Millisecond):
					t.Logf("No attack detected as expected")
				}
			}
		})
	}
}
