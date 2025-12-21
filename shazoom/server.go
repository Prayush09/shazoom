package main

import (
	"context"
	"crypto/tls"
	"fmt"
	"log"
	"log/slog"
	"math"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"shazoom/core"
	"shazoom/db"
	"shazoom/fileformat"
	"shazoom/utils"
	"strconv"
	"strings"
	"time"

	"shazoom/spotify"

	"github.com/fatih/color"
	socketio "github.com/googollee/go-socket.io"
	"github.com/googollee/go-socket.io/engineio"
	"github.com/googollee/go-socket.io/engineio/transport"
	"github.com/googollee/go-socket.io/engineio/transport/polling"
	"github.com/googollee/go-socket.io/engineio/transport/websocket"
	"github.com/mdobak/go-xerrors"
)

const SONGS_DIR = "songs"

var yellow = color.New(color.FgYellow)

func find(filePath string) {
	wavFilePath, err := fileformat.ConvertToWAV(filePath)
	if err != nil {
		yellow.Println("Error converting to WAV:", err)
		return
	}

	fingerprint, err := core.GenerateFingerprints(wavFilePath, utils.GenerateUniqueID())
	if err != nil {
		yellow.Println("Error generating fingerprints:", err)
		return
	}

	sampleFingerprint := make(map[int64]uint32)
	for address, couple := range fingerprint {
		sampleFingerprint[address] = couple.AnchorTime
	}

	matches, searchDuration, err := core.FindMatchesUsingFingerPrints(sampleFingerprint)
	if err != nil {
		yellow.Println("Error finding matches:", err)
		return
	}

	if len(matches) == 0 {
		fmt.Println("\nNo Matches Found :(")
		fmt.Printf("\nSearch duration: %s\n", searchDuration)
		return
	}

	topMatches := matches
	if len(matches) > 20 {
		topMatches = matches[:20]
	}

	fmt.Println("Top matches:")
	for _, match := range topMatches {
		fmt.Printf("  - %s by %s (%.2f)\n", match.SongTitle, match.SongArtist, match.Score)
	}

	best := topMatches[0]
	fmt.Printf("\nPrediction: %s by %s (%.2f)\n",
		best.SongTitle, best.SongArtist, best.Score)
}


func download(spotifyURL string, dbClient db.DBClient) (int, error) {
    if err := utils.CreateFolder(SONGS_DIR); err != nil {
        err = xerrors.New(err)
        logger := utils.GetLogger()
        logger.ErrorContext(context.Background(),
            "failed to create songs directory",
            slog.Any("error", err),
        )
        return 0, err
    }

    var count int
    var err error

    switch {
    case strings.Contains(spotifyURL, "album"):
        count, err = spotify.DlAlbum(spotifyURL, SONGS_DIR, dbClient)
    case strings.Contains(spotifyURL, "playlist"):
        count, err = spotify.DlPlaylist(spotifyURL, SONGS_DIR, dbClient)
    case strings.Contains(spotifyURL, "track"):
        count, err = spotify.DlSingleTrack(spotifyURL, SONGS_DIR, dbClient)
    default:
        return 0, fmt.Errorf("unsupported Spotify URL format: %s", spotifyURL)
    }

    if err != nil {
        return count, xerrors.New(err)
    }

    return count, nil
}

func serve(protocol, port string, dbClient db.DBClient) { 
    protocol = strings.ToLower(protocol)

    allowOrigin := func(r *http.Request) bool {
        return true 
    }

   server := socketio.NewServer(&engineio.Options{
    Transports: []transport.Transport{
		&polling.Transport{
				CheckOrigin: allowOrigin,
			},
		&websocket.Transport{
				CheckOrigin: allowOrigin,
			},
		},
		PingTimeout:  time.Second * 30,
		PingInterval: time.Second * 10,
	})

    server.OnConnect("/", func(c socketio.Conn) error {
        c.SetContext("") 
        log.Println("Socket connected:", c.ID())
        return nil
    })
    
    server.OnEvent("/", "totalSongs", func(s socketio.Conn) {
        handleTotalSongs(s, dbClient)
    })

    server.OnEvent("/", "newDownload", func(s socketio.Conn, url string) {
        handleSongDownload(s, url, dbClient)
    })

    server.OnEvent("/", "newRecording", func(s socketio.Conn, data string) {
        handleNewRecording(s, data)
    })

    // ------------------------------------------

    server.OnError("/", func(c socketio.Conn, err error) {
        log.Printf("Socket error from %v: %v", c.ID(), err)
    })

    server.OnDisconnect("/", func(c socketio.Conn, reason string) {
        log.Printf("Socket disconnected (%v): %v", c.ID(), reason)
    })

    go func() {
        if err := server.Serve(); err != nil {
            log.Fatalf("socketio listen error: %v", err)
        }
    }()
    defer server.Close()

    serveHTTP(server, protocol == "https", port)
}

func serveHTTP(socketServer *socketio.Server, serveHTTPS bool, port string) {
	mux := http.NewServeMux()
	mux.Handle("/socket.io/", socketServer)
	mux.Handle("/", http.FileServer(http.Dir("static")))

	if serveHTTPS {
		certKey := utils.GetEnv("CERT_KEY",
			"/etc/letsencrypt/live/localport.online/privkey.pem",
		)
		certFile := utils.GetEnv("CERT_FILE",
			"/etc/letsencrypt/live/localport.online/fullchain.pem",
		)

		if certKey == "" || certFile == "" {
			log.Fatal("Missing TLS cert or key")
		}

		httpsServer := &http.Server{
			Addr:    ":" + port,
			Handler: mux,
			TLSConfig: &tls.Config{
				MinVersion: tls.VersionTLS12,
			},
		}

		go func() {
			redirectPort := utils.GetEnv("REDIRECT_PORT", "80")
			log.Printf("HTTP redirect on :%s\n", redirectPort)

			log.Fatal(http.ListenAndServe(":"+redirectPort,
				http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					target := "https://" + r.Host + r.URL.RequestURI()
					http.Redirect(w, r, target, http.StatusMovedPermanently)
				}),
			))
		}()

		log.Printf("HTTPS listening on :%s\n", port)
		log.Fatal(httpsServer.ListenAndServeTLS(certFile, certKey))
		return
	}

	log.Printf("HTTP listening on :%s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, mux))
}


func erase(songsDir string, all bool, dbClient db.DBClient) {

	_ = dbClient.DeleteCollection("fingerprints")
	_ = dbClient.DeleteCollection("songs")

	fmt.Println("Database cleared")

	if all {
		_ = filepath.Walk(songsDir, func(path string, info os.FileInfo, err error) error {
			if err == nil && !info.IsDir() {
				ext := filepath.Ext(path)
				if ext == ".wav" || ext == ".m4a" {
					_ = os.Remove(path)
				}
			}
			return nil
		})
		fmt.Println("Songs directory cleared")
	}

	fmt.Println("Erase complete")
}



func save(path string, force bool, dbClient db.DBClient) {
	info, err := os.Stat(path)
	if err != nil {
		fmt.Println(err)
		return
	}

	if info.IsDir() {
		var files []string
		_ = filepath.Walk(path, func(p string, i os.FileInfo, e error) error {
			if e == nil && !i.IsDir() {
				files = append(files, p)
			}
			return nil
		})
		processFilesConCurrently(files, force, dbClient)
		return
	}

	_ = saveSong(path, force, dbClient)
}

func processFilesConCurrently(filePaths []string, force bool, dbClient db.DBClient) {
	maxWorkers := max(1, runtime.NumCPU()/2)
	jobs := make(chan string, len(filePaths))
	results := make(chan error, len(filePaths))

	for i := 0; i < maxWorkers; i++ {
		go func() {
			defer func() {
				if r := recover(); r != nil {
					results <- fmt.Errorf("panic: %v", r)
				}
			}()
			for p := range jobs {
				results <- saveSong(p, force, dbClient)
			}
		}()
	}

	for _, p := range filePaths {
		jobs <- p
	}
	close(jobs)

	for range filePaths {
		<-results
	}
}


func saveSong(filePath string, force bool, dbClient db.DBClient) error {
	meta, err := fileformat.GetMetadata(filePath)
	if err != nil {
		return err
	}

	duration, _ := strconv.ParseFloat(meta.Format.Duration, 64)

	tags := meta.Format.Tags
	track := &spotify.Track{
		Album:    tags["album"],
		Artist:   tags["artist"],
		Title:    tags["title"],
		Duration: int(math.Round(duration)),
	}

	if track.Title == "" {
		track.Title = strings.TrimSuffix(filepath.Base(filePath), filepath.Ext(filePath))
	}

	if track.Artist == "" {
		return fmt.Errorf("missing artist metadata")
	}

	ytID, err := spotify.GetYoutubeId(*track)
	if err != nil && !force {
		return err
	}

	if err := spotify.ProcessAndSaveSong(filePath, track.Title, track.Artist, ytID, dbClient); err != nil {
		return err
	}

	src := filepath.Join(filepath.Dir(filePath), track.Title+".wav")
	dst := filepath.Join(SONGS_DIR, track.Title+".wav")
	return utils.MoveFile(src, dst)
}
