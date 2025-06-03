package shield

type Shield struct {
}

func (s *Shield) Enable() {
	println("Shield is enabled")

}

func (s *Shield) Disable() {
	println("Shield is disabled")

}
