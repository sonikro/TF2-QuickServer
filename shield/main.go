package main

import (
	"context"
	"os/signal"
	"syscall"

	"github.com/sonikro/tf2-quickserver-shield/pkg/radar"
)

func main() {
	const iface = "eth0" // Change to your interface name if needed

	// Create a context that listens for OS signals to gracefully shut down
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()
	attackRadar := radar.NewAttackRadar(iface, radar.DefaultProcFSFactory)

	attackRadar.StartMonitoring(ctx)
}
