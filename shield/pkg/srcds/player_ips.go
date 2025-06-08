package srcds

import (
	"strings"
)

func GetPlayerIPs(executeCommand func(command string) (string, error)) ([]string, error) {
	response, err := executeCommand("status")
	if err != nil {
		return nil, err
	}

	var ips []string
	lines := splitLines(response)
	for _, line := range lines {
		if len(line) > 0 && line[0] == '#' && strings.Contains(line, "active") {
			parts := strings.Fields(line)
			if len(parts) > 0 {
				ipAndPort := parts[len(parts)-1]
				ip := strings.Split(ipAndPort, ":")[0]
				if ip != "active" {
					ips = append(ips, ip)
				}
			}
		}
	}

	// Also capture TV client IPs
	tvResponse, err := executeCommand("tv_clients")
	if err == nil && len(tvResponse) > 0 {
		tvLines := splitLines(tvResponse)
		for _, tvLine := range tvLines {
			if strings.HasPrefix(tvLine, "ID") && strings.Count(tvLine, ",") >= 3 {
				lineSegments := strings.Split(tvLine, ",")
				if len(lineSegments) > 3 {
					ipLine := strings.TrimSpace(lineSegments[3])
					if idx := strings.Index(ipLine, ":"); idx > 0 {
						ip := ipLine[:idx]
						ips = append(ips, ip)
					}
				}
			}
		}
	}

	return ips, nil
}

func splitLines(s string) []string {
	return strings.Split(s, "\n")
}
