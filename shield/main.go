package main

import (
	"context"
	"net"
	"os/signal"
	"syscall"

	"github.com/gorcon/rcon"
	"github.com/oracle/oci-go-sdk/v65/common/auth"
	"github.com/oracle/oci-go-sdk/v65/core"
	"github.com/sonikro/tf2-quickserver-shield/pkg/config"
	"github.com/sonikro/tf2-quickserver-shield/pkg/oracle"
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

	// Setup Dependencies
	ociConfigProvider, err := auth.InstancePrincipalConfigurationProvider()
	if err != nil {
		panic(err)
	}
	nsgClient, err := core.NewVirtualNetworkClientWithConfigurationProvider(ociConfigProvider)
	if err != nil {
		panic(err)
	}

	shield := shield.Shield{
		RconDial: func(address, password string, options ...rcon.Option) (srcds.RconConnection, error) {
			return rcon.Dial(address, password, options...)
		},
		SrcdsSettings: *srcds.NewSrcdsSettingsFromEnv(),
		EnableFirewallRestriction: func(playerIps []string) error {
			return oracle.EnableFirewallRestriction(ctx, nsgClient, config.GetNSGID(), playerIps)
		},
		DisableFirewallRestriction: func() error {
			return oracle.DisableFirewallRestriction(ctx, nsgClient, config.GetNSGID())
		},
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
