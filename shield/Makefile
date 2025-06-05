# Makefile for shield package

.PHONY: all test build docker-build

all: build

test:
	go test ./...

build:
	go build -o bin/shield ./main.go

docker-build:
	docker build -f Dockerfile -t shield:latest .
