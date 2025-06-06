package oracle

import (
	context "context"
	fmt "fmt"
	strings "strings"

	"github.com/oracle/oci-go-sdk/v65/common"
	"github.com/oracle/oci-go-sdk/v65/core"
)

// VirtualNetwork interface abstracts the methods needed for NSG operations.
type VirtualNetwork interface {
	AddNetworkSecurityGroupSecurityRules(ctx context.Context, req core.AddNetworkSecurityGroupSecurityRulesRequest) (core.AddNetworkSecurityGroupSecurityRulesResponse, error)
	RemoveNetworkSecurityGroupSecurityRules(ctx context.Context, req core.RemoveNetworkSecurityGroupSecurityRulesRequest) (core.RemoveNetworkSecurityGroupSecurityRulesResponse, error)
	ListNetworkSecurityGroupSecurityRules(ctx context.Context, req core.ListNetworkSecurityGroupSecurityRulesRequest) (core.ListNetworkSecurityGroupSecurityRulesResponse, error)
}

// EnableFirewallRestriction updates the NSG to only allow inbound traffic from the given IPs, all ports, dropping all others.
func EnableFirewallRestriction(ctx context.Context, client VirtualNetwork, nsgID string, ips []string) error {
	var rules []core.AddSecurityRuleDetails
	for _, ip := range ips {
		cidr := ip
		if !strings.Contains(ip, "/") {
			cidr = ip + "/32"
		}
		rules = append(rules, core.AddSecurityRuleDetails{
			Direction:   core.AddSecurityRuleDetailsDirectionIngress,
			Source:      &cidr,
			SourceType:  core.AddSecurityRuleDetailsSourceTypeCidrBlock,
			Protocol:    common.String("all"),
			IsStateless: common.Bool(false),
		})
	}

	// List current ingress rules before adding new ones
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
			oldIngressRuleIDs = append(oldIngressRuleIDs, *rule.Id)
		}
	}

	// Add new rules
	if len(rules) > 0 {
		addReq := core.AddNetworkSecurityGroupSecurityRulesRequest{
			NetworkSecurityGroupId: &nsgID,
			AddNetworkSecurityGroupSecurityRulesDetails: core.AddNetworkSecurityGroupSecurityRulesDetails{
				SecurityRules: rules,
			},
		}
		_, err := client.AddNetworkSecurityGroupSecurityRules(ctx, addReq)
		if err != nil {
			return fmt.Errorf("failed to add ingress rules: %w", err)
		}
	}

	// Remove old ingress rules
	if len(oldIngressRuleIDs) > 0 {
		removeReq := core.RemoveNetworkSecurityGroupSecurityRulesRequest{
			NetworkSecurityGroupId: &nsgID,
			RemoveNetworkSecurityGroupSecurityRulesDetails: core.RemoveNetworkSecurityGroupSecurityRulesDetails{
				SecurityRuleIds: oldIngressRuleIDs,
			},
		}
		_, err := client.RemoveNetworkSecurityGroupSecurityRules(ctx, removeReq)
		if err != nil {
			return fmt.Errorf("failed to remove old ingress rules: %w", err)
		}
	}

	return nil
}

// DisableFirewallRestriction resets the NSG to allow all inbound traffic from all IPs to ports 27015-27020 TCP and UDP, removing all other ingress rules.
func DisableFirewallRestriction(ctx context.Context, client VirtualNetwork, nsgID string) error {
	// List current ingress rules before adding new ones
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
			oldIngressRuleIDs = append(oldIngressRuleIDs, *rule.Id)
		}
	}

	// Add new rules for TCP and UDP 27015-27020 from 0.0.0.0/0
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
		return fmt.Errorf("failed to add allow-all rules: %w", err)
	}

	// Remove old ingress rules
	if len(oldIngressRuleIDs) > 0 {
		removeReq := core.RemoveNetworkSecurityGroupSecurityRulesRequest{
			NetworkSecurityGroupId: &nsgID,
			RemoveNetworkSecurityGroupSecurityRulesDetails: core.RemoveNetworkSecurityGroupSecurityRulesDetails{
				SecurityRuleIds: oldIngressRuleIDs,
			},
		}
		_, err := client.RemoveNetworkSecurityGroupSecurityRules(ctx, removeReq)
		if err != nil {
			return fmt.Errorf("failed to remove old ingress rules: %w", err)
		}
	}

	return nil
}
