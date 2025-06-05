package srcds

import (
	rconLib "github.com/gorcon/rcon"
)

type RconClient func(address string, password string, options ...rconLib.Option) (*rconLib.Conn, error)

type RconConnection interface {
	Execute(command string) (string, error)
	Close() error
}
