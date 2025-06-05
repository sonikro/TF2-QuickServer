# syntax=docker/dockerfile:1

# --- Build stage ---
FROM golang:1.24-alpine AS builder
WORKDIR /app
COPY ./ ./
RUN go build -o shield ./main.go

# --- Final stage ---
FROM scratch
WORKDIR /
COPY --from=builder /app/shield ./shield

# Environment variables (can be overridden at runtime)
ENV IFACE=
ENV MAXBYTES=

ENTRYPOINT ["/shield"]
