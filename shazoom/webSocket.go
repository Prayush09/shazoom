package main

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log/slog"
	"strings"
	"time"
	"shazoom/db"
	"shazoom/core"
	"shazoom/spotify"
	"shazoom/utils"
	"shazoom/fileformat"

	socketio "github.com/googollee/go-socket.io"
)



func emitStatus(socket socketio.Conn, statusType, message string) {
	socket.Emit("downloadStatus", map[string]any{
		"type":    statusType,
		"message": message,
	})
}


func handleTotalSongs(socket socketio.Conn, dbClient db.DBClient) {
	logger := utils.GetLogger()
	ctx := context.Background()


	totalSongs, err := dbClient.TotalSongs()
	if err != nil {
		logger.ErrorContext(ctx, "failed to get total songs", slog.Any("error", err))
		return
	}

	socket.Emit("totalSongs", totalSongs)
}

func handleSongDownload(socket socketio.Conn, spotifyURL string, dbClient db.DBClient) {
	logger := utils.GetLogger()
	ctx := context.Background()

	switch {
	case strings.Contains(spotifyURL, "album"):
		tracks, err := spotify.AlbumInfo(spotifyURL)
		if err != nil {
			emitStatus(socket, "error", err.Error())
			return
		}

		emitStatus(socket, "info",
			fmt.Sprintf("%d songs found in album.", len(tracks)),
		)

		count, err := spotify.DlAlbum(spotifyURL, SONGS_DIR, dbClient)
		if err != nil {
			logger.ErrorContext(ctx, "album download failed", slog.Any("error", err))
			emitStatus(socket, "error", "Failed to download album.")
			return
		}

		emitStatus(socket, "success",
			fmt.Sprintf("%d songs downloaded from album.", count),
		)

	case strings.Contains(spotifyURL, "playlist"):
		tracks, err := spotify.PlaylistInfo(spotifyURL)
		if err != nil {
			emitStatus(socket, "error", err.Error())
			return
		}

		emitStatus(socket, "info",
			fmt.Sprintf("%d songs found in playlist.", len(tracks)),
		)

		count, err := spotify.DlPlaylist(spotifyURL, SONGS_DIR, dbClient)
		if err != nil {
			logger.ErrorContext(ctx, "playlist download failed", slog.Any("error", err))
			emitStatus(socket, "error", "Failed to download playlist.")
			return
		}

		emitStatus(socket, "success",
			fmt.Sprintf("%d songs downloaded from playlist.", count),
		)

	case strings.Contains(spotifyURL, "track"):
		track, err := spotify.TrackInfo(spotifyURL)
		if err != nil {
			emitStatus(socket, "error", err.Error())
			return
		}

		dbClient, err := db.NewDBClient()
		if err != nil {
			logger.ErrorContext(ctx, "DB connection failed", slog.Any("error", err))
			return
		}
		defer dbClient.Close()

		key := utils.GenerateSongKey(track.Title, track.Artist)
		existing, exists, err := dbClient.GetSongByKey(key)
		if err == nil && exists {
			emitStatus(socket, "error",
				fmt.Sprintf("'%s' by '%s' already exists (YouTube ID: %s)",
					existing.Title, existing.Artist, existing.YouTubeID),
			)
			return
		}

		count, err := spotify.DlSingleTrack(spotifyURL, SONGS_DIR, dbClient)
		if err != nil || count != 1 {
			emitStatus(socket, "error", "Track download failed.")
			return
		}

		emitStatus(socket, "success",
			fmt.Sprintf("'%s' by '%s' downloaded.", track.Title, track.Artist),
		)

	default:
		emitStatus(socket, "error", "Invalid Spotify URL.")
	}
}

func handleNewRecording(socket socketio.Conn, recordData string, dbClient db.DBClient) {
	logger := utils.GetLogger()
	ctx := context.Background()

	var rec struct {
		Audio      string `json:"audio"`
		SampleRate int    `json:"sampleRate"`
		Channels   int    `json:"channels"`
	}

	if err := json.Unmarshal([]byte(recordData), &rec); err != nil {
		logger.ErrorContext(ctx, "invalid recording payload", slog.Any("error", err))
		return
	}

	audioBytes, err := base64.StdEncoding.DecodeString(rec.Audio)
	if err != nil {
		logger.ErrorContext(ctx, "failed to decode base64 audio", slog.Any("error", err))
		return
	}

	if err := utils.CreateFolder("recordings"); err != nil {
		logger.ErrorContext(ctx, "failed to create recordings dir", slog.Any("error", err))
		return
	}

	filePath := fmt.Sprintf(
		"recordings/%d.wav",
		time.Now().UnixNano(),
	)

	if err := fileformat.WriteWavFile(
		filePath,
		audioBytes,
		rec.SampleRate,
		rec.Channels,
		16,
	); err != nil {
		logger.ErrorContext(ctx, "failed to write wav", slog.Any("error", err))
		return
	}

	fingerprint, err := core.GenerateFingerprints(filePath, utils.GenerateUniqueID())
	if err != nil {
		logger.ErrorContext(ctx, "fingerprint generation failed", slog.Any("error", err))
		return
	}

	sampleFingerprint := make(map[int64]uint32)
	for addr, couple := range fingerprint {
		sampleFingerprint[addr] = couple.AnchorTime
	}

	matches, _, err := core.FindMatchesUsingFingerPrints(sampleFingerprint)
	if err != nil {
		logger.ErrorContext(ctx, "matching failed", slog.Any("error", err))
		return
	}

	if len(matches) > 10 {
		matches = matches[:10]
	}

	socket.Emit("matches", matches)
}


