package main

import (
	"context"
	"fmt"
	"net"
	"os/signal"
	"syscall"
	"time"

	"github.com/gorcon/rcon"
	"github.com/oracle/oci-go-sdk/v65/common"
	"github.com/oracle/oci-go-sdk/v65/core"
	"github.com/sonikro/tf2-quickserver-shield/pkg/config"
	"github.com/sonikro/tf2-quickserver-shield/pkg/oracle"
	"github.com/sonikro/tf2-quickserver-shield/pkg/radar"
	"github.com/sonikro/tf2-quickserver-shield/pkg/shield"
	"github.com/sonikro/tf2-quickserver-shield/pkg/srcds"
)

func main() {
	fmt.Println("[Main] Starting TF2 QuickServer Shield...")
	iface, err := config.GetIface(net.Interfaces)
	if err != nil {
		fmt.Printf("[Main] Failed to get network interface: %v\n", err)
		panic(err)
	}
	fmt.Printf("[Main] Monitoring interface: %s\n", iface)
	maxBytes := config.GetMaxBytes()
	fmt.Printf("[Main] Max bytes per interval: %d\n", maxBytes)

	// Create a context that listens for OS signals to gracefully shut down
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()
	// Setup Dependencies
	fmt.Println("[Main] Initializing OCI config provider...")
	oracle.SetupOciCredentials(oracle.OSFileSystem{})
	ociConfigProvider := common.DefaultConfigProvider()
	fmt.Println("[Main] Creating NSG client...")
	nsgClient, err := core.NewVirtualNetworkClientWithConfigurationProvider(ociConfigProvider)
	if err != nil {
		fmt.Printf("[Main] Failed to create NSG client: %v\n", err)
		panic(err)
	}
	fmt.Println("[Main] NSG client created.")

	oracleParameters, err := config.GetOracleParameters()
	if err != nil {
		fmt.Printf("[Main] Failed to get Oracle parameters: %v\n", err)
		panic(err)
	}
	fmt.Printf("[Main] Oracle parameters: %+v\n", oracleParameters)
	shield := shield.Shield{
		RconDial: func(address, password string, options ...rcon.Option) (srcds.RconConnection, error) {
			fmt.Printf("[Main] Dialing RCON at %s...\n", address)
			return rcon.Dial(address, password, options...)
		},
		SrcdsSettings: *srcds.NewSrcdsSettingsFromEnv(),
		EnableFirewallRestriction: func(playerIps []string) error {
			fmt.Printf("[Main] Enabling firewall restriction for player IPs: %v\n", playerIps)
			return oracle.EnableFirewallRestriction(ctx, nsgClient, oracleParameters, playerIps)
		},
		DisableFirewallRestriction: func() error {
			fmt.Println("[Main] Disabling firewall restriction...")
			return oracle.DisableFirewallRestriction(ctx, nsgClient, oracleParameters)
		},
		ShieldDuration: time.Minute * 3, // Duration for which the shield is active
	}

	fmt.Println("[Main] Initializing AttackRadar...")
	attackRadar := radar.NewAttackRadar(
		iface,
		radar.DefaultProcFSFactory,
		maxBytes,
		radar.DefaultTresholdTime,
		shield.OnAttackDetected,
		radar.DefaulPollInterval,
	)
	fmt.Println("[Main] Starting AttackRadar monitoring loop...")
	attackRadar.StartMonitoring(ctx)
	fmt.Println("[Main] AttackRadar monitoring stopped. Exiting.")
}
