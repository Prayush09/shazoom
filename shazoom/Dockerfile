# Build
FROM golang:1.24-alpine AS builder
RUN apk add --no-cache gcc musl-dev portaudio-dev ffmpeg-dev git
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=1 GOOS=linux go build -o shazoom-backend .


FROM alpine:latest

#RUN
RUN apk add --no-cache \
    ffmpeg \
    portaudio \
    ca-certificates \
    python3 \
    py3-pip \
    curl \
    nodejs


RUN curl -L \
    https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
    -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /root/
COPY --from=builder /app/shazoom-backend .

RUN mkdir -p /tmp/songs /tmp/recordings /tmp/tmp && \
    ln -s /tmp/songs /root/songs && \
    ln -s /tmp/recordings /root/recordings && \
    ln -s /tmp/tmp /root/tmp

EXPOSE 8080

#EXECUTE
CMD ["./shazoom-backend", "serve", "-p", "8080"]
