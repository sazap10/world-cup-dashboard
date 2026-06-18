# syntax=docker/dockerfile:1

# ---- Stage 1: build the static SPA with Node ----
FROM node:26-alpine AS web
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Stage 2: build the static Go server binary ----
FROM golang:1.26-alpine AS server
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY server ./server
# CGO off + trimmed/stripped → a fully static binary that runs on distroless/static.
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/server ./server

# ---- Stage 3: minimal runtime — just the binary + built assets ----
# distroless/static has no shell or package manager (tiny attack surface) and
# bundles CA certs (for the HTTPS upstream) and a nonroot user.
FROM gcr.io/distroless/static-debian12:nonroot AS runtime
WORKDIR /app
ENV PORT=8080
ENV DIST_DIR=/app/dist

COPY --from=server /out/server /app/server
COPY --from=web /app/dist /app/dist

USER nonroot
EXPOSE 8080
# No shell/wget in distroless, so the binary self-probes via its -healthcheck flag.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD ["/app/server", "-healthcheck"]

ENTRYPOINT ["/app/server"]
