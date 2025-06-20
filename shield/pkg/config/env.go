package config

import (
	"errors"
	"net"
	"os"
	"strconv"
)

// GetNetworkInterfaces is a function that returns a slice of net.Interface and an error.
type GetNetworkInterfaces func() ([]net.Interface, error)

// ErrNoNonLoopbackInterface is returned when no suitable network interface is found.
var ErrNoNonLoopbackInterface = errors.New("no non-loopback network interface found")

// GetIface returns the network interface name from the IFACE environment variable, or auto-detects a non-loopback interface if not set.
func GetIface(getNetworkInterfaces GetNetworkInterfaces) (string, error) {
	iface := os.Getenv("IFACE")
	if iface == "" {
		ifaces, err := getNetworkInterfaces()
		if err != nil {
			return "", err
		}
		for _, i := range ifaces {
			if (i.Flags&net.FlagLoopback) == 0 && (i.Flags&net.FlagUp) != 0 {
				return i.Name, nil
			}
		}
		return "", ErrNoNonLoopbackInterface
	}
	return iface, nil
}

// GetMaxBytes returns the max bytes from the MAXBYTES environment variable, or 100000000 if not set or invalid.
func GetMaxBytes() uint64 {
	maxBytes := uint64(100000000)
	if mbStr := os.Getenv("MAXBYTES"); mbStr != "" {
		if mb, err := strconv.ParseUint(mbStr, 10, 64); err == nil {
			maxBytes = mb
		}
	}
	return maxBytes
}

type OracleParameters struct {
	NsgName       string
	CompartmentId string
	VcnId         string
}

func GetOracleParameters() (OracleParameters, error) {
	nsgName := os.Getenv("NSG_NAME")
	if nsgName == "" {
		return OracleParameters{}, errors.New("NSG_NAME environment variable is not set")
	}

	compartmentId := os.Getenv("COMPARTMENT_ID")
	if compartmentId == "" {
		return OracleParameters{}, errors.New("COMPARTMENT_ID environment variable is not set")
	}

	vcnId := os.Getenv("VCN_ID")
	if vcnId == "" {
		return OracleParameters{}, errors.New("VCN_ID environment variable is not set")
	}

	return OracleParameters{
		NsgName:       nsgName,
		CompartmentId: compartmentId,
		VcnId:         vcnId,
	}, nil
}
