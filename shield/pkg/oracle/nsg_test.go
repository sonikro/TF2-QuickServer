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
		name          string
		ips           []string
		existingRules []core.SecurityRule
		wantAdd       []core.AddSecurityRuleDetails
		wantRemove    []string
		oracleParams  config.OracleParameters
	}{
		{
			name: "it should add new rules for a single IP, and remove old ingress rules",
			ips:  []string{"1.2.3.4"},
			existingRules: []core.SecurityRule{{
				Id:        strPtr("old-ingress"),
				Direction: "INGRESS",
			}},
			wantAdd: []core.AddSecurityRuleDetails{{
				Direction:  core.AddSecurityRuleDetailsDirectionIngress,
				Source:     strPtr("1.2.3.4/32"),
				SourceType: core.AddSecurityRuleDetailsSourceTypeCidrBlock,
				Protocol:   strPtr("all"),
			}},
			wantRemove: []string{"old-ingress"},
			oracleParams: config.OracleParameters{
				NsgName:       "nsgid",
				CompartmentId: "compartmentid",
				VcnId:         "vcnid",
			},
		},
		{
			name:          "it should add multiple ips and not remove any old rules if there are any",
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
			wantRemove: nil,
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
			if len(tt.wantRemove) > 0 {
				if len(mock.RemoveRulesReqs) != 1 {
					t.Fatalf("expected 1 remove call, got %d", len(mock.RemoveRulesReqs))
				}
				removed := mock.RemoveRulesReqs[0].RemoveNetworkSecurityGroupSecurityRulesDetails.SecurityRuleIds
				if !equalStringSlices(removed, tt.wantRemove) {
					t.Errorf("expected removed %v, got %v", tt.wantRemove, removed)
				}
			} else if len(mock.RemoveRulesReqs) != 0 {
				t.Errorf("expected no remove calls, got %d", len(mock.RemoveRulesReqs))
			}
		})
	}
}

func TestDisableFirewallRestriction(t *testing.T) {
	tests := []struct {
		name         string
		listItems    []core.SecurityRule
		wantAdd      []core.AddSecurityRuleDetails
		wantRemove   []string
		oracleParams config.OracleParameters
	}{
		{
			name: "adds new rules and removes old ingress rules",
			listItems: []core.SecurityRule{{
				Id:        strPtr("old-ingress"),
				Direction: "INGRESS",
			}},
			wantAdd: []core.AddSecurityRuleDetails{
				{
					Direction:  core.AddSecurityRuleDetailsDirectionIngress,
					Source:     strPtr("0.0.0.0/0"),
					SourceType: core.AddSecurityRuleDetailsSourceTypeCidrBlock,
					Protocol:   strPtr("6"),
				},
				{
					Direction:  core.AddSecurityRuleDetailsDirectionIngress,
					Source:     strPtr("0.0.0.0/0"),
					SourceType: core.AddSecurityRuleDetailsSourceTypeCidrBlock,
					Protocol:   strPtr("17"),
				},
			},
			wantRemove: []string{"old-ingress"},
			oracleParams: config.OracleParameters{
				NsgName:       "nsgid",
				CompartmentId: "compartmentid",
				VcnId:         "vcnid",
			},
		},
		{
			name:      "no old ingress rules",
			listItems: nil,
			wantAdd: []core.AddSecurityRuleDetails{
				{
					Direction:  core.AddSecurityRuleDetailsDirectionIngress,
					Source:     strPtr("0.0.0.0/0"),
					SourceType: core.AddSecurityRuleDetailsSourceTypeCidrBlock,
					Protocol:   strPtr("6"),
				},
				{
					Direction:  core.AddSecurityRuleDetailsDirectionIngress,
					Source:     strPtr("0.0.0.0/0"),
					SourceType: core.AddSecurityRuleDetailsSourceTypeCidrBlock,
					Protocol:   strPtr("17"),
				},
			},
			wantRemove: nil,
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
				// Check port range for TCP/UDP rules
				if *got.Protocol == "6" && got.TcpOptions != nil {
					if got.TcpOptions.DestinationPortRange == nil ||
						*got.TcpOptions.DestinationPortRange.Min != 27015 ||
						*got.TcpOptions.DestinationPortRange.Max != 27020 {
						t.Errorf("TCP rule %d has wrong port range: got %+v", i, got.TcpOptions.DestinationPortRange)
					}
				}
				if *got.Protocol == "17" && got.UdpOptions != nil {
					if got.UdpOptions.DestinationPortRange == nil ||
						*got.UdpOptions.DestinationPortRange.Min != 27015 ||
						*got.UdpOptions.DestinationPortRange.Max != 27020 {
						t.Errorf("UDP rule %d has wrong port range: got %+v", i, got.UdpOptions.DestinationPortRange)
					}
				}
			}
			if len(tt.wantRemove) > 0 {
				if len(mock.RemoveRulesReqs) != 1 {
					t.Fatalf("expected 1 remove call, got %d", len(mock.RemoveRulesReqs))
				}
				removed := mock.RemoveRulesReqs[0].RemoveNetworkSecurityGroupSecurityRulesDetails.SecurityRuleIds
				if !equalStringSlices(removed, tt.wantRemove) {
					t.Errorf("expected removed %v, got %v", tt.wantRemove, removed)
				}
			} else if len(mock.RemoveRulesReqs) != 0 {
				t.Errorf("expected no remove calls, got %d", len(mock.RemoveRulesReqs))
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

func strPtr(s string) *string { return &s }
