package oracle

import (
	"context"
	"testing"

	"github.com/oracle/oci-go-sdk/v65/core"
	"github.com/sonikro/tf2-quickserver-shield/pkg/config"
)

type mockVirtualNetworkClient struct {
	AddRulesReqs    []core.AddNetworkSecurityGroupSecurityRulesRequest
	RemoveRulesReqs []core.RemoveNetworkSecurityGroupSecurityRulesRequest
	ListRulesResp   core.ListNetworkSecurityGroupSecurityRulesResponse
	AddErr          error
	RemoveErr       error
	ListErr         error
}

// Add mock for ListNetworkSecurityGroups
func (m *mockVirtualNetworkClient) ListNetworkSecurityGroups(ctx context.Context, req core.ListNetworkSecurityGroupsRequest) (core.ListNetworkSecurityGroupsResponse, error) {
	return core.ListNetworkSecurityGroupsResponse{
		Items: []core.NetworkSecurityGroup{{
			Id: strPtr("nsgid"),
		}},
	}, nil
}

func (m *mockVirtualNetworkClient) AddNetworkSecurityGroupSecurityRules(ctx context.Context, req core.AddNetworkSecurityGroupSecurityRulesRequest) (core.AddNetworkSecurityGroupSecurityRulesResponse, error) {
	m.AddRulesReqs = append(m.AddRulesReqs, req)
	return core.AddNetworkSecurityGroupSecurityRulesResponse{}, m.AddErr
}

func (m *mockVirtualNetworkClient) RemoveNetworkSecurityGroupSecurityRules(ctx context.Context, req core.RemoveNetworkSecurityGroupSecurityRulesRequest) (core.RemoveNetworkSecurityGroupSecurityRulesResponse, error) {
	m.RemoveRulesReqs = append(m.RemoveRulesReqs, req)
	return core.RemoveNetworkSecurityGroupSecurityRulesResponse{}, m.RemoveErr
}

func (m *mockVirtualNetworkClient) ListNetworkSecurityGroupSecurityRules(ctx context.Context, req core.ListNetworkSecurityGroupSecurityRulesRequest) (core.ListNetworkSecurityGroupSecurityRulesResponse, error) {
	return m.ListRulesResp, m.ListErr
}

func TestEnableFirewallRestriction(t *testing.T) {
	tests := []struct {
		name              string
		ips               []string
		existingRules     []core.SecurityRule
		wantAdd           []core.AddSecurityRuleDetails
		wantRemoveIngress []string
		wantRemoveEgress  []string
		oracleParams      config.OracleParameters
	}{
		{
			name: "it should add new rules for a single IP, and remove old ingress and egress rules",
			ips:  []string{"1.2.3.4"},
			existingRules: []core.SecurityRule{
				{
					Id:        strPtr("old-ingress"),
					Direction: "INGRESS",
				},
				{
					Id:        strPtr("old-egress"),
					Direction: "EGRESS",
				},
			},
			wantAdd: []core.AddSecurityRuleDetails{{
				Direction:  core.AddSecurityRuleDetailsDirectionIngress,
				Source:     strPtr("1.2.3.4/32"),
				SourceType: core.AddSecurityRuleDetailsSourceTypeCidrBlock,
				Protocol:   strPtr("all"),
			}},
			wantRemoveIngress: []string{"old-ingress"},
			wantRemoveEgress:  []string{"old-egress"},
			oracleParams: config.OracleParameters{
				NsgName:       "nsgid",
				CompartmentId: "compartmentid",
				VcnId:         "vcnid",
			},
		},
		{
			name:          "it should add multiple ips and not remove any old rules if there are none",
			ips:           []string{"1.2.3.4", "5.6.7.8"},
			existingRules: nil,
			wantAdd: []core.AddSecurityRuleDetails{
				{
					Direction:  core.AddSecurityRuleDetailsDirectionIngress,
					Source:     strPtr("1.2.3.4/32"),
					SourceType: core.AddSecurityRuleDetailsSourceTypeCidrBlock,
					Protocol:   strPtr("all"),
				},
				{
					Direction:  core.AddSecurityRuleDetailsDirectionIngress,
					Source:     strPtr("5.6.7.8/32"),
					SourceType: core.AddSecurityRuleDetailsSourceTypeCidrBlock,
					Protocol:   strPtr("all"),
				},
			},
			wantRemoveIngress: nil,
			wantRemoveEgress:  nil,
			oracleParams: config.OracleParameters{
				NsgName:       "nsgid",
				CompartmentId: "compartmentid",
				VcnId:         "vcnid",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mock := &mockVirtualNetworkClient{
				ListRulesResp: core.ListNetworkSecurityGroupSecurityRulesResponse{
					Items: tt.existingRules,
				},
			}
			err := EnableFirewallRestriction(context.Background(), mock, tt.oracleParams, tt.ips)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if len(mock.AddRulesReqs) != 1 {
				t.Fatalf("expected 1 add call, got %d", len(mock.AddRulesReqs))
			}
			added := mock.AddRulesReqs[0].AddNetworkSecurityGroupSecurityRulesDetails.SecurityRules
			if len(added) != len(tt.wantAdd) {
				t.Errorf("expected %d rules added, got %d", len(tt.wantAdd), len(added))
			}
			for i, want := range tt.wantAdd {
				got := added[i]
				if got.Direction != want.Direction ||
					(got.Source == nil || *got.Source != *want.Source) ||
					got.SourceType != want.SourceType ||
					(got.Protocol == nil || *got.Protocol != *want.Protocol) {
					t.Errorf("rule %d mismatch: got %+v, want %+v", i, got, want)
				}
			}

			// Check remove calls - may have 0, 1, or 2 remove calls depending on ingress/egress rules
			expectedRemoveCalls := 0
			if len(tt.wantRemoveIngress) > 0 {
				expectedRemoveCalls++
			}
			if len(tt.wantRemoveEgress) > 0 {
				expectedRemoveCalls++
			}
			if len(mock.RemoveRulesReqs) != expectedRemoveCalls {
				t.Fatalf("expected %d remove calls, got %d", expectedRemoveCalls, len(mock.RemoveRulesReqs))
			}

			// Verify removed rule IDs
			var allRemovedIDs []string
			for _, req := range mock.RemoveRulesReqs {
				allRemovedIDs = append(allRemovedIDs, req.RemoveNetworkSecurityGroupSecurityRulesDetails.SecurityRuleIds...)
			}
			expectedRemoved := append(tt.wantRemoveIngress, tt.wantRemoveEgress...)
			if !equalStringSlicesUnordered(allRemovedIDs, expectedRemoved) {
				t.Errorf("expected removed %v, got %v", expectedRemoved, allRemovedIDs)
			}
		})
	}
}

func TestDisableFirewallRestriction(t *testing.T) {
	tests := []struct {
		name              string
		listItems         []core.SecurityRule
		wantAddCount      int
		wantRemoveIngress []string
		wantRemoveEgress  []string
		oracleParams      config.OracleParameters
	}{
		{
			name: "adds new rules including allow-all UDP and removes old ingress and egress rules",
			listItems: []core.SecurityRule{
				{
					Id:        strPtr("old-ingress"),
					Direction: "INGRESS",
				},
				{
					Id:        strPtr("old-egress"),
					Direction: "EGRESS",
				},
			},
			wantAddCount:      4, // TCP port-specific, UDP port-specific, UDP all ingress, UDP all egress
			wantRemoveIngress: []string{"old-ingress"},
			wantRemoveEgress:  []string{"old-egress"},
			oracleParams: config.OracleParameters{
				NsgName:       "nsgid",
				CompartmentId: "compartmentid",
				VcnId:         "vcnid",
			},
		},
		{
			name:              "no old rules to remove",
			listItems:         nil,
			wantAddCount:      4,
			wantRemoveIngress: nil,
			wantRemoveEgress:  nil,
			oracleParams: config.OracleParameters{
				NsgName:       "nsgid",
				CompartmentId: "compartmentid",
				VcnId:         "vcnid",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mock := &mockVirtualNetworkClient{
				ListRulesResp: core.ListNetworkSecurityGroupSecurityRulesResponse{
					Items: tt.listItems,
				},
			}
			err := DisableFirewallRestriction(context.Background(), mock, tt.oracleParams)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if len(mock.AddRulesReqs) != 1 {
				t.Fatalf("expected 1 add call, got %d", len(mock.AddRulesReqs))
			}
			added := mock.AddRulesReqs[0].AddNetworkSecurityGroupSecurityRulesDetails.SecurityRules
			if len(added) != tt.wantAddCount {
				t.Errorf("expected %d rules added, got %d", tt.wantAddCount, len(added))
			}

			// Verify we have the expected rule types
			var hasTcpPortSpecific, hasUdpPortSpecific, hasUdpAllIngress, hasUdpAllEgress bool
			for _, rule := range added {
				if rule.Protocol != nil && *rule.Protocol == "6" && rule.TcpOptions != nil {
					hasTcpPortSpecific = true
				}
				if rule.Protocol != nil && *rule.Protocol == "17" {
					if rule.UdpOptions != nil && rule.UdpOptions.DestinationPortRange != nil {
						hasUdpPortSpecific = true
					} else if rule.Direction == core.AddSecurityRuleDetailsDirectionIngress && rule.UdpOptions == nil {
						hasUdpAllIngress = true
					} else if rule.Direction == core.AddSecurityRuleDetailsDirectionEgress {
						hasUdpAllEgress = true
					}
				}
			}
			if !hasTcpPortSpecific {
				t.Error("missing TCP port-specific rule")
			}
			if !hasUdpPortSpecific {
				t.Error("missing UDP port-specific rule")
			}
			if !hasUdpAllIngress {
				t.Error("missing UDP allow-all ingress rule")
			}
			if !hasUdpAllEgress {
				t.Error("missing UDP allow-all egress rule")
			}

			// Check remove calls
			expectedRemoveCalls := 0
			if len(tt.wantRemoveIngress) > 0 {
				expectedRemoveCalls++
			}
			if len(tt.wantRemoveEgress) > 0 {
				expectedRemoveCalls++
			}
			if len(mock.RemoveRulesReqs) != expectedRemoveCalls {
				t.Fatalf("expected %d remove calls, got %d", expectedRemoveCalls, len(mock.RemoveRulesReqs))
			}

			// Verify removed rule IDs
			var allRemovedIDs []string
			for _, req := range mock.RemoveRulesReqs {
				allRemovedIDs = append(allRemovedIDs, req.RemoveNetworkSecurityGroupSecurityRulesDetails.SecurityRuleIds...)
			}
			expectedRemoved := append(tt.wantRemoveIngress, tt.wantRemoveEgress...)
			if !equalStringSlicesUnordered(allRemovedIDs, expectedRemoved) {
				t.Errorf("expected removed %v, got %v", expectedRemoved, allRemovedIDs)
			}
		})
	}
}

func equalStringSlices(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}

func equalStringSlicesUnordered(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	aMap := make(map[string]int)
	for _, s := range a {
		aMap[s]++
	}
	for _, s := range b {
		if aMap[s] == 0 {
			return false
		}
		aMap[s]--
	}
	return true
}

func strPtr(s string) *string { return &s }
