package main

import (
	"context"
	"os/signal"
	"syscall"

	"github.com/sonikro/tf2-quickserver-shield/pkg/config"
	"github.com/sonikro/tf2-quickserver-shield/pkg/radar"
	"github.com/sonikro/tf2-quickserver-shield/pkg/shield"
)

func main() {
	iface := config.GetIface()
	maxBytes := config.GetMaxBytes()

	// Create a context that listens for OS signals to gracefully shut down
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	shield := shield.Shield{}

	attackRadar := radar.NewAttackRadar(
		iface,
		radar.DefaultProcFSFactory,
		maxBytes,
		shield.OnAttackDetected,
	)

	attackRadar.StartMonitoring(ctx)
}
