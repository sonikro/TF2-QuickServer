package main

import (
	"context"
	"net"
	"os/signal"
	"syscall"

	"github.com/gorcon/rcon"
	"github.com/sonikro/tf2-quickserver-shield/pkg/config"
	"github.com/sonikro/tf2-quickserver-shield/pkg/radar"
	"github.com/sonikro/tf2-quickserver-shield/pkg/shield"
	"github.com/sonikro/tf2-quickserver-shield/pkg/srcds"
)

func main() {
	iface, err := config.GetIface(net.Interfaces)
	if err != nil {
		panic(err)
	}
	maxBytes := config.GetMaxBytes()

	// Create a context that listens for OS signals to gracefully shut down
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	shield := shield.Shield{
		RconDial:      rcon.Dial,
		SrcdsSettings: *srcds.NewSrcdsSettingsFromEnv(),
	}

	attackRadar := radar.NewAttackRadar(
		iface,
		radar.DefaultProcFSFactory,
		maxBytes,
		radar.DefaultTresholdTime,
		shield.OnAttackDetected,
		radar.DefaulPollInterval,
	)

	attackRadar.StartMonitoring(ctx)
}
