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
		name          string
		mockStats     []procfs.NetDevLine
		maxBytes      uint64
		thresholdTime time.Duration
		pollInterval  time.Duration
		expectAttack  bool
		attackDelay   time.Duration // How long to stay above threshold before expecting attack
	}{
		{
			name: "attack detected after thresholdTime",
			mockStats: []procfs.NetDevLine{
				{Name: "eth0", RxBytes: 0},
				{Name: "eth0", RxBytes: 200}, // delta = 200
				{Name: "eth0", RxBytes: 400}, // delta = 200
				{Name: "eth0", RxBytes: 600}, // delta = 200
			},
			maxBytes:      100,
			pollInterval:  10 * time.Millisecond,
			thresholdTime: 20 * time.Millisecond,
			expectAttack:  true,
			attackDelay:   1 * time.Second,
		},
		{
			name: "no attack if not above threshold long enough",
			mockStats: []procfs.NetDevLine{
				{Name: "eth0", RxBytes: 0},
				{Name: "eth0", RxBytes: 200}, // delta = 200
				{Name: "eth0", RxBytes: 250}, // delta = 50 (drops below)
			},
			maxBytes:      100,
			thresholdTime: 20 * time.Millisecond,
			expectAttack:  false,
			pollInterval:  10 * time.Millisecond,
			attackDelay:   20 * time.Millisecond,
		},
		{
			name: "attack not detected if always below threshold",
			mockStats: []procfs.NetDevLine{
				{Name: "eth0", RxBytes: 0},
				{Name: "eth0", RxBytes: 50},
				{Name: "eth0", RxBytes: 100},
			},
			maxBytes:      100,
			thresholdTime: 20 * time.Millisecond,
			expectAttack:  false,
			pollInterval:  10 * time.Millisecond,
			attackDelay:   20 * time.Millisecond,
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
					if timesCalled < len(tt.mockStats) {
						return procfs.NetDev{"eth0": tt.mockStats[timesCalled]}, nil
					}
					// Instead of returning the last stat forever, return a constant high value to keep delta high
					return procfs.NetDev{"eth0": {Name: "eth0", RxBytes: tt.mockStats[len(tt.mockStats)-1].RxBytes + 1000}}, nil
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

			// Use a very short poll interval for tests
			rad := radar.NewAttackRadar(iface, procFSFactory, tt.maxBytes, tt.thresholdTime, onAttack, tt.pollInterval)
			ctx, cancel := context.WithCancel(context.Background())
			defer cancel()
			go rad.StartMonitoring(ctx)

			if tt.expectAttack {
				select {
				case <-attackChannel:
					t.Logf("Attack detected as expected")
				case <-time.After(tt.thresholdTime + tt.attackDelay):
					t.Fatal("Timeout waiting for attack detection")
				}
			} else {
				select {
				case <-attackChannel:
					t.Fatal("Attack detected unexpectedly")
				case <-time.After(tt.thresholdTime + tt.attackDelay):
					t.Logf("No attack detected as expected")
				}
			}
		})
	}
}
