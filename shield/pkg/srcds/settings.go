package srcds

import (
	"os"
)

type SrcdsSettings struct {
	Ip       string
	Port     string
	Password string
}

func NewSrcdsSettingsFromEnv() *SrcdsSettings {
	ip := os.Getenv("SRCDS_IP")
	if ip == "" {
		ip = "127.0.0.1"
	}
	port := os.Getenv("SRCDS_PORT")
	if port == "" {
		port = "27015"
	}
	password := os.Getenv("SRCDS_PASSWORD")

	if ip == "" || port == "" || password == "" {
		panic("SRCDS_IP, SRCDS_PORT, and SRCDS_PASSWORD environment variables must be set")
	}

	return &SrcdsSettings{
		Ip:       ip,
		Port:     port,
		Password: password,
	}
}
