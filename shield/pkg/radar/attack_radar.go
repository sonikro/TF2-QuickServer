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
	iface             string
	procFSFactory     ProcFSFactory
	maxBytesThreshold uint64
	thresholdTime     time.Duration
	onAttackDetected  OnAttackDetected
	pollInterval      time.Duration
}

func DefaultProcFSFactory(path string) (ProcFS, error) {
	fs, err := procfs.NewFS(path)
	return fs, err
}

func NewAttackRadar(iface string, procFSFactory ProcFSFactory, maxBytesPerSecond uint64, thresholdTime time.Duration, onAttackDetected OnAttackDetected, pollInterval time.Duration) *AttackRadar {
	return &AttackRadar{
		iface:             iface,
		procFSFactory:     procFSFactory,
		maxBytesThreshold: maxBytesPerSecond,
		onAttackDetected:  onAttackDetected,
		thresholdTime:     thresholdTime,
		pollInterval:      pollInterval,
	}
}

var DefaultTresholdTime = 5 * time.Second
var DefaulPollInterval = 1 * time.Second

func (attackRadar *AttackRadar) StartMonitoring(ctx context.Context) {
	var lastRx uint64
	var aboveThresholdStart time.Time
	var aboveThreshold bool

	fs, err := attackRadar.procFSFactory("/proc")
	if err != nil {
		log.Fatalf("failed to open procfs: %v", err)
	}

	interval := attackRadar.pollInterval
	if interval <= 0 {
		interval = time.Second
	}

	for {
		select {
		case <-ctx.Done():
			log.Println("Stopping AttackRadar monitoring due to context cancellation")
			return
		default:
			log.Printf("Polling network stats for interface %s", attackRadar.iface)
			netDev, err := fs.NetDev()
			if err != nil {
				log.Printf("failed to read net dev stats: %v", err)
				time.Sleep(interval)
				continue
			}

			log.Printf("Found %d network devices", len(netDev))
			for _, dev := range netDev {
				log.Printf("Device: %s, RxBytes: %d", dev.Name, dev.RxBytes)
				if dev.Name == attackRadar.iface {
					log.Printf("Monitoring interface %s", dev.Name)
					if lastRx != 0 {
						delta := dev.RxBytes - lastRx
						log.Printf("Delta bytes for %s: %d (lastRx: %d, currentRx: %d)", dev.Name, delta, lastRx, dev.RxBytes)
						if delta > attackRadar.maxBytesThreshold {
							if !aboveThreshold {
								aboveThreshold = true
								log.Printf("Detected high traffic on interface %s: %d bytes in the last interval", attackRadar.iface, delta)
								aboveThresholdStart = time.Now()
							} else if time.Since(aboveThresholdStart) >= attackRadar.thresholdTime {
								log.Printf("Attack detected on interface %s: sustained high traffic of %d bytes for at least %s", attackRadar.iface, delta, attackRadar.thresholdTime)
								attackRadar.onAttackDetected(attackRadar.iface, delta)
							}
						} else {
							if aboveThreshold {
								log.Printf("Traffic dropped below threshold on interface %s", attackRadar.iface)
							}
							aboveThreshold = false
						}
					}
					lastRx = dev.RxBytes
				}
			}
			time.Sleep(interval)
		}
	}
}
