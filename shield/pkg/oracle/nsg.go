package oracle

import (
	context "context"
	fmt "fmt"
	strings "strings"

	"github.com/oracle/oci-go-sdk/v65/common"
	"github.com/oracle/oci-go-sdk/v65/core"
	"github.com/sonikro/tf2-quickserver-shield/pkg/config"
)

// VirtualNetwork interface abstracts the methods needed for NSG operations.
type VirtualNetwork interface {
	AddNetworkSecurityGroupSecurityRules(ctx context.Context, req core.AddNetworkSecurityGroupSecurityRulesRequest) (core.AddNetworkSecurityGroupSecurityRulesResponse, error)
	RemoveNetworkSecurityGroupSecurityRules(ctx context.Context, req core.RemoveNetworkSecurityGroupSecurityRulesRequest) (core.RemoveNetworkSecurityGroupSecurityRulesResponse, error)
	ListNetworkSecurityGroupSecurityRules(ctx context.Context, req core.ListNetworkSecurityGroupSecurityRulesRequest) (core.ListNetworkSecurityGroupSecurityRulesResponse, error)
	ListNetworkSecurityGroups(ctx context.Context, request core.ListNetworkSecurityGroupsRequest) (response core.ListNetworkSecurityGroupsResponse, err error)
}

// EnableFirewallRestriction updates the NSG to only allow inbound traffic from the given IPs, all ports, dropping all others.
func EnableFirewallRestriction(ctx context.Context, client VirtualNetwork, oracleParameters config.OracleParameters, ips []string) error {
	fmt.Printf("[NSG] Enabling firewall restriction for NSG '%s' with allowed IPs: %v\n", oracleParameters, ips)
	var rules []core.AddSecurityRuleDetails
	for _, ip := range ips {
		cidr := ip
		if !strings.Contains(ip, "/") {
			cidr = ip + "/32"
		}
		fmt.Printf("[NSG] Adding ingress rule for source: %s\n", cidr)
		rules = append(rules, core.AddSecurityRuleDetails{
			Direction:   core.AddSecurityRuleDetailsDirectionIngress,
			Source:      &cidr,
			SourceType:  core.AddSecurityRuleDetailsSourceTypeCidrBlock,
			Protocol:    common.String("all"),
			IsStateless: common.Bool(false),
		})
	}

	nsgID, err := getNsgByName(ctx, client, oracleParameters)
	if err != nil {
		fmt.Printf("[NSG] Failed to get NSG by name '%s': %v\n", oracleParameters, err)
		return err
	}
	fmt.Printf("[NSG] NSG ID for '%s' is %s\n", oracleParameters, nsgID)

	// List current ingress rules before adding new ones
	fmt.Println("[NSG] Listing current ingress rules before adding new ones...")
	listReq := core.ListNetworkSecurityGroupSecurityRulesRequest{
		NetworkSecurityGroupId: &nsgID,
	}
	listResp, err := client.ListNetworkSecurityGroupSecurityRules(ctx, listReq)
	if err != nil {
		return fmt.Errorf("failed to list NSG rules: %w", err)
	}

	var oldIngressRuleIDs []string
	for _, rule := range listResp.Items {
		if string(rule.Direction) == "INGRESS" {
			fmt.Printf("[NSG] Marking old ingress rule for removal: %s\n", *rule.Id)
			oldIngressRuleIDs = append(oldIngressRuleIDs, *rule.Id)
		}
	}

	// Add new rules
	if len(rules) > 0 {
		fmt.Printf("[NSG] Adding %d new ingress rules...\n", len(rules))
		addReq := core.AddNetworkSecurityGroupSecurityRulesRequest{
			NetworkSecurityGroupId: &nsgID,
			AddNetworkSecurityGroupSecurityRulesDetails: core.AddNetworkSecurityGroupSecurityRulesDetails{
				SecurityRules: rules,
			},
		}
		_, err := client.AddNetworkSecurityGroupSecurityRules(ctx, addReq)
		if err != nil {
			fmt.Printf("[NSG] Failed to add ingress rules: %v\n", err)
			return fmt.Errorf("failed to add ingress rules: %w", err)
		}
		fmt.Println("[NSG] Successfully added new ingress rules.")
	}

	// Remove old ingress rules
	if len(oldIngressRuleIDs) > 0 {
		fmt.Printf("[NSG] Removing %d old ingress rules...\n", len(oldIngressRuleIDs))
		removeReq := core.RemoveNetworkSecurityGroupSecurityRulesRequest{
			NetworkSecurityGroupId: &nsgID,
			RemoveNetworkSecurityGroupSecurityRulesDetails: core.RemoveNetworkSecurityGroupSecurityRulesDetails{
				SecurityRuleIds: oldIngressRuleIDs,
			},
		}
		_, err := client.RemoveNetworkSecurityGroupSecurityRules(ctx, removeReq)
		if err != nil {
			fmt.Printf("[NSG] Failed to remove old ingress rules: %v\n", err)
			return fmt.Errorf("failed to remove old ingress rules: %w", err)
		}
		fmt.Println("[NSG] Successfully removed old ingress rules.")
	}

	fmt.Println("[NSG] Firewall restriction enabled.")
	return nil
}

// DisableFirewallRestriction resets the NSG to allow all inbound traffic from all IPs to ports 27015-27020 TCP and UDP, removing all other ingress rules.
func DisableFirewallRestriction(ctx context.Context, client VirtualNetwork, oracleParameters config.OracleParameters) error {
	fmt.Printf("[NSG] Disabling firewall restriction for NSG '%s' (allowing all on 27015-27020 TCP/UDP)\n", oracleParameters)
	nsgID, err := getNsgByName(ctx, client, oracleParameters)
	if err != nil {
		fmt.Printf("[NSG] Failed to get NSG by name '%s': %v\n", oracleParameters, err)
		return err
	}
	fmt.Printf("[NSG] NSG ID for '%s' is %s\n", oracleParameters, nsgID)
	// List current ingress rules before adding new ones
	fmt.Println("[NSG] Listing current ingress rules before resetting...")
	listReq := core.ListNetworkSecurityGroupSecurityRulesRequest{
		NetworkSecurityGroupId: &nsgID,
	}
	listResp, err := client.ListNetworkSecurityGroupSecurityRules(ctx, listReq)
	if err != nil {
		return fmt.Errorf("failed to list NSG rules: %w", err)
	}

	var oldIngressRuleIDs []string
	for _, rule := range listResp.Items {
		if string(rule.Direction) == "INGRESS" {
			fmt.Printf("[NSG] Marking old ingress rule for removal: %s\n", *rule.Id)
			oldIngressRuleIDs = append(oldIngressRuleIDs, *rule.Id)
		}
	}

	// Add new rules for TCP and UDP 27015-27020 from 0.0.0.0/0
	fmt.Println("[NSG] Adding allow-all rules for TCP/UDP 27015-27020 from 0.0.0.0/0...")
	allCIDR := "0.0.0.0/0"
	tcpProto := "6"
	udpProto := "17"
	rules := []core.AddSecurityRuleDetails{
		{
			Direction:   core.AddSecurityRuleDetailsDirectionIngress,
			Source:      &allCIDR,
			SourceType:  core.AddSecurityRuleDetailsSourceTypeCidrBlock,
			Protocol:    &tcpProto,
			IsStateless: common.Bool(false),
			TcpOptions: &core.TcpOptions{
				DestinationPortRange: &core.PortRange{
					Min: common.Int(27015),
					Max: common.Int(27020),
				},
			},
		},
		{
			Direction:   core.AddSecurityRuleDetailsDirectionIngress,
			Source:      &allCIDR,
			SourceType:  core.AddSecurityRuleDetailsSourceTypeCidrBlock,
			Protocol:    &udpProto,
			IsStateless: common.Bool(false),
			UdpOptions: &core.UdpOptions{
				DestinationPortRange: &core.PortRange{
					Min: common.Int(27015),
					Max: common.Int(27020),
				},
			},
		},
	}

	addReq := core.AddNetworkSecurityGroupSecurityRulesRequest{
		NetworkSecurityGroupId: &nsgID,
		AddNetworkSecurityGroupSecurityRulesDetails: core.AddNetworkSecurityGroupSecurityRulesDetails{
			SecurityRules: rules,
		},
	}
	_, err = client.AddNetworkSecurityGroupSecurityRules(ctx, addReq)
	if err != nil {
		fmt.Printf("[NSG] Failed to add allow-all rules: %v\n", err)
		return fmt.Errorf("failed to add allow-all rules: %w", err)
	}
	fmt.Println("[NSG] Successfully added allow-all rules.")

	// Remove old ingress rules
	if len(oldIngressRuleIDs) > 0 {
		fmt.Printf("[NSG] Removing %d old ingress rules...\n", len(oldIngressRuleIDs))
		removeReq := core.RemoveNetworkSecurityGroupSecurityRulesRequest{
			NetworkSecurityGroupId: &nsgID,
			RemoveNetworkSecurityGroupSecurityRulesDetails: core.RemoveNetworkSecurityGroupSecurityRulesDetails{
				SecurityRuleIds: oldIngressRuleIDs,
			},
		}
		_, err := client.RemoveNetworkSecurityGroupSecurityRules(ctx, removeReq)
		if err != nil {
			fmt.Printf("[NSG] Failed to remove old ingress rules: %v\n", err)
			return fmt.Errorf("failed to remove old ingress rules: %w", err)
		}
		fmt.Println("[NSG] Successfully removed old ingress rules.")
	}

	fmt.Println("[NSG] Firewall restriction disabled (allow-all rules active).")
	return nil
}

// getNsgByName returns the ID of the NSG with the given name, or an error if not found.
func getNsgByName(ctx context.Context, client VirtualNetwork, oracleParameters config.OracleParameters) (string, error) {
	nsgs, err := client.ListNetworkSecurityGroups(ctx, core.ListNetworkSecurityGroupsRequest{
		DisplayName:   &oracleParameters.NsgName,
		CompartmentId: &oracleParameters.CompartmentId,
		VcnId:         &oracleParameters.VcnId,
	})
	if err != nil {
		return "", fmt.Errorf("failed to list NSGs: %w", err)
	}
	if len(nsgs.Items) == 0 {
		return "", fmt.Errorf("no NSG found with name %s", oracleParameters)
	}
	return *nsgs.Items[0].Id, nil
}
