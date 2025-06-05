package shield

type Shield struct {
}

func (s *Shield) OnAttackDetected(iface string, bytes uint64) {
	println("Attack detected on interface", iface, "with", bytes, "bytes")
}
