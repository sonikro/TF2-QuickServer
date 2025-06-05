package shield

import (
	"fmt"
	"strconv"

	"github.com/sonikro/tf2-quickserver-shield/pkg/srcds"
)

type Shield struct {
	SrcdsSettings srcds.SrcdsSettings
	RconDial      srcds.RconClient
}

func (s *Shield) OnAttackDetected(iface string, bytes uint64) {
	println("Attack detected on interface", iface, "with", bytes, "bytes")
	conn, err := s.RconDial(fmt.Sprintf("%s:%s", s.SrcdsSettings.Ip, s.SrcdsSettings.Port), s.SrcdsSettings.Password)
	if err != nil {
		println("Failed to connect to RCON:", err.Error())
		return
	}
	defer conn.Close()

	response, err := conn.Execute("say 'Attack detected on interface " + iface + " with " + strconv.FormatUint(bytes, 10) + " bytes'")
	if err != nil {
		println("Failed to execute RCON command:", err.Error())
		return
	}

	fmt.Println(response)
}
