package spotify

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"shazoom/core"
	"shazoom/db"
	"shazoom/utils"
	"strings"
	"sync"
	"time"

	"github.com/mdobak/go-xerrors"
)

const DELETE_SONG_FILE = false

// Added dbClient to signature
func DlSingleTrack(url, savePath string, dbClient db.DBClient) (int, error) {
	logger := utils.GetLogger()
	logger.Info("Getting track info", slog.String("url", url))
	trackInfo, err := TrackInfo(url)
	if err != nil {
		return 0, err
	}

	track := []Track{*trackInfo}
	logger.Info("Now downloading track")
	return dlTrack(track, savePath, dbClient)
}

func DlPlaylist(url, savePath string, dbClient db.DBClient) (int, error) {
	logger := utils.GetLogger()
	tracks, err := PlaylistInfo(url)
	if err != nil {
		return 0, err
	}

	time.Sleep(1 * time.Second)
	logger.Info("Now downloading playlist")
	return dlTrack(tracks, savePath, dbClient)
}

func DlAlbum(url, savePath string, dbClient db.DBClient) (int, error) {
	logger := utils.GetLogger()
	tracks, err := AlbumInfo(url)
	if err != nil {
		return 0, err
	}

	time.Sleep(1 * time.Second)
	logger.Info("Now downloading album")
	return dlTrack(tracks, savePath, dbClient)
}

func dlTrack(tracks []Track, path string, dbClient db.DBClient) (int, error) {
	var wg sync.WaitGroup
	var totalTracks int
	logger := utils.GetLogger()
	results := make(chan int, len(tracks))
	numCPUs := runtime.NumCPU()
	semaphore := make(chan struct{}, numCPUs)
	ctx := context.Background()

	for _, t := range tracks {
		wg.Add(1)
		go func(track Track) {
			defer wg.Done()
			semaphore <- struct{}{}
			defer func() { <-semaphore }()

			trackCopy := &Track{
				Album:    track.Album,
				Artist:   track.Artist,
				Artists:  track.Artists,
				Duration: track.Duration,
				Title:    track.Title,
			}

			// check if song exists using shared client
			keyExists, err := SongKeyExists(utils.GenerateSongKey(trackCopy.Title, trackCopy.Artist), dbClient)
			if err != nil {
				logger.ErrorContext(ctx, "error checking song existence", slog.Any("error", xerrors.New(err)))
			}
			if keyExists {
				logger.Info(fmt.Sprintf("'%s' by '%s' already exists.", trackCopy.Title, trackCopy.Artist))
				return
			}

			ytID, err := getYTID(trackCopy, dbClient)
			if ytID == "" || err != nil {
				logger.ErrorContext(ctx, "Download failed", slog.Any("error", xerrors.New(err)))
				return
			}

			trackCopy.Title, trackCopy.Artist = correctFilename(trackCopy.Title, trackCopy.Artist)
			fileName := fmt.Sprintf("%s - %s", trackCopy.Title, trackCopy.Artist)
			filePath := filepath.Join(path, fileName)

			downloadedPath, err := downloadYTaudio(ytID, filePath)
			if err != nil {
				logger.ErrorContext(ctx, "yt-dlp failed", slog.Any("error", xerrors.New(err)))
				return
			}

			// Pass client to processing
			err = ProcessAndSaveSong(downloadedPath, trackCopy.Title, trackCopy.Artist, ytID, dbClient)
			if err != nil {
				logger.ErrorContext(ctx, "DB save failed", slog.Any("error", xerrors.New(err)))
				return
			}

			wavFilePath := filepath.Join(path, fileName+".wav")
			_ = addTags(wavFilePath, *trackCopy)

			if DELETE_SONG_FILE {
				utils.DeleteFile(wavFilePath)
			}

			logger.Info(fmt.Sprintf("'%s' by '%s' was downloaded", track.Title, track.Artist))
			results <- 1
		}(t)
	}

	go func() {
		wg.Wait()
		close(results)
	}()

	for range results {
		totalTracks++
	}
	return totalTracks, nil
}

func addTags(file string, track Track) error {
	logger := utils.GetLogger()
	
	// Create a temporary file name to avoid editing in-place
	tempFile := strings.TrimSuffix(file, ".wav") + "_tagged.wav"

	// FFmpeg command to add metadata tags
	// -i: input file
	// -c:copy: copy the audio stream without re-encoding
	// -metadata: sets the specific key=value pairs
	cmd := exec.Command(
		"ffmpeg",
		"-i", file, 
		"-c", "copy",
		"-metadata", fmt.Sprintf("title=%s", track.Title),
		"-metadata", fmt.Sprintf("artist=%s", track.Artist),
		"-metadata", fmt.Sprintf("album_artist=%s", track.Artist),
		"-metadata", fmt.Sprintf("album=%s", track.Album),
		"-y", // overwrite output file if it exists
		tempFile, 
	)

	out, err := cmd.CombinedOutput()
	if err != nil {
		logger.Error("Failed to add tags via ffmpeg", slog.Any("error", err), slog.String("output", string(out)))
		return fmt.Errorf("failed to add tags: %v", err)
	}

	// Replace the original file with the tagged version
	if err := os.Rename(tempFile, file); err != nil {
		logger.Error("Failed to rename tagged file", slog.Any("error", err))
		return fmt.Errorf("failed to rename file: %v", err)
	}

	return nil
}

func ProcessAndSaveSong(songFilePath, songTitle, songArtist, ytID string, dbClient db.DBClient) error {
	logger := utils.GetLogger()

	// Register the song
	songID, err := dbClient.RegisterSong(songTitle, songArtist, ytID)
	if err != nil {
		return err
	}

	fingerprint, err := core.GenerateFingerprints(songFilePath, songID)
	if err != nil {
		_ = dbClient.DeleteSongByID(songID)
		return err
	}

	err = dbClient.StoreFingerprints(fingerprint)
	if err != nil {
		_ = dbClient.DeleteSongByID(songID)
		return err
	}

	logger.Info(fmt.Sprintf("Fingerprint for %v by %v saved successfully", songTitle, songArtist))
	return nil
}

func getYTID(trackCopy *Track, dbClient db.DBClient) (string, error) {
	ytID, err := GetYoutubeId(*trackCopy)
	if ytID == "" || err != nil {
		return "", err
	}

	// Check if YouTube ID exists using shared client
	ytidExists, err := YtIDExists(ytID, dbClient)
	if err != nil {
		return "", err
	}

	if ytidExists {
		return "", fmt.Errorf("youTube ID (%s) already exists in DB", ytID)
	}

	return ytID, nil
}