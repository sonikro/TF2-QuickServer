package radar

import (
	"context"
	"log"
	"time"

	"github.com/prometheus/procfs"
	"github.com/sonikro/tf2-quickserver-shield/pkg/shield"
)

type ProcFS interface {
	NetDev() (procfs.NetDev, error)
}

type ProcFSFactory func(string) (ProcFS, error)

type AttackRadar struct {
	iface         string
	procFSFactory ProcFSFactory
	// maxBytesPerSecond is the threshold for detecting an attack
	maxBytesPerSecond uint64
	// shield is an instance of the Shield that can be used to enable/disable protection
	shield shield.Shield
}

func DefaultProcFSFactory(path string) (ProcFS, error) {
	fs, err := procfs.NewFS(path)
	return fs, err
}

func NewAttackRadar(iface string, procFSFactory ProcFSFactory) *AttackRadar {
	return &AttackRadar{
		iface:         iface,
		procFSFactory: procFSFactory,
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
							attackRadar.shield.Enable()
							log.Printf("Potential attack detected on %s: %d bytes in the last second", attackRadar.iface, delta)

						}
					}
					lastRx = dev.RxBytes
				}
			}
			time.Sleep(1 * time.Second)
		}
	}
}
