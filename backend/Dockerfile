FROM golang:1.23-alpine AS build
WORKDIR /src
COPY go.mod ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /gameserver ./cmd/gameserver

FROM alpine:3.20
RUN apk add --no-cache ca-certificates
WORKDIR /app
COPY --from=build /gameserver /app/gameserver
ENV PORT=8080
EXPOSE 8080
USER nobody
ENTRYPOINT ["/app/gameserver"]
