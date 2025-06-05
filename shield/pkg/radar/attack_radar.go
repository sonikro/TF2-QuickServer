package radar

import (
	"context"
	"log"
	"time"

	"github.com/prometheus/procfs"
)

type ProcFS interface {
	NetDev() (procfs.NetDev, error)
}

type ProcFSFactory func(string) (ProcFS, error)

type OnAttackDetected func(iface string, bytes uint64)

type AttackRadar struct {
	iface         string
	procFSFactory ProcFSFactory
	// maxBytesPerSecond is the threshold for detecting an attack
	maxBytesPerSecond uint64
	// shield is an instance of the Shield that can be used to enable/disable protection
	onAttackDetected OnAttackDetected
}

func DefaultProcFSFactory(path string) (ProcFS, error) {
	fs, err := procfs.NewFS(path)
	return fs, err
}

func NewAttackRadar(iface string, procFSFactory ProcFSFactory, maxBytesPerSecond uint64, onAttackDetected OnAttackDetected) *AttackRadar {
	return &AttackRadar{
		iface:             iface,
		procFSFactory:     procFSFactory,
		maxBytesPerSecond: maxBytesPerSecond,
		onAttackDetected:  onAttackDetected,
	}
}

func (attackRadar *AttackRadar) StartMonitoring(ctx context.Context) {
	var lastRx uint64

	fs, err := attackRadar.procFSFactory("/proc")
	if err != nil {
		log.Fatalf("failed to open procfs: %v", err)
	}

	for {
		select {
		case <-ctx.Done():
			log.Println("Stopping AttackRadar monitoring due to context cancellation")
			return
		default:
			// Continue monitoring
			netDev, err := fs.NetDev()
			if err != nil {
				log.Printf("failed to read net dev stats: %v", err)
				time.Sleep(1 * time.Second)
				continue
			}

			for _, dev := range netDev {
				if dev.Name == attackRadar.iface {
					if lastRx != 0 {
						delta := dev.RxBytes - lastRx
						if delta > attackRadar.maxBytesPerSecond {
							attackRadar.onAttackDetected(attackRadar.iface, delta)
						}
					}
					lastRx = dev.RxBytes
				}
			}
			time.Sleep(1 * time.Second)
		}
	}
}
