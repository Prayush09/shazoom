package main

import (
	"context"
	"flag"
	"fmt"
	"log/slog"
	"os"
	"log"
	"shazoom/db" // Make sure this import matches your project structure
	"shazoom/utils"

	"github.com/joho/godotenv"
	"github.com/mdobak/go-xerrors"
)

func main() {
	// 1. Load .env first
	err := godotenv.Load();
	if err != nil {
		log.Fatalf("FAILED TO LOAD ENV!: %v", err)
	}

	logger := utils.GetLogger()
	ctx := context.Background()

	dbClient, err := db.NewDBClient()
	if err != nil {
		logger.ErrorContext(ctx, "CRITICAL: Could not connect to database", slog.Any("error", err))
		fmt.Println("\n--- Troubleshooting DB Connection ---")
		fmt.Println("1. Check if your IP is whitelisted in Google Cloud SQL.")
		fmt.Println("2. Verify DB_USER and DB_PASSWORD in your .env file.")
		fmt.Println("--------------------------------------")
		os.Exit(1)
	}
	defer dbClient.Close()

	if err := utils.CreateFolder("tmp"); err != nil {
		err = xerrors.New(err)
		logger.ErrorContext(ctx, "failed to create tmp directory", slog.Any("error", err))
		os.Exit(1)
	}

	if err := utils.CreateFolder(SONGS_DIR); err != nil {
		err = xerrors.New(err)
		logger.ErrorContext(ctx, "failed to create songs directory", slog.Any("error", err))
		os.Exit(1)
	}

	if len(os.Args) < 2 {
		printUsage()
		os.Exit(1)
	}

	switch os.Args[1] {
	case "find":
		if len(os.Args) < 3 {
			fmt.Println("Usage: find <path_to_wav_file>")
			os.Exit(1)
		}
		find(os.Args[2])

	case "download":
		if len(os.Args) < 3 {
			fmt.Println("Usage: download <spotify_url>")
			os.Exit(1)
		}
		
		fmt.Println("🚀 Starting download...")
		count, err := download(os.Args[2], dbClient)
		
		if err != nil {
			// This will now print EXACTLY why it failed (Auth, Network, etc.)
			fmt.Printf("\n❌ Download failed: %v\n", err)
			os.Exit(1)
		}
		
		fmt.Printf("\n✅ Successfully processed %d track(s)!\n", count)

	case "serve":
		serveCmd := flag.NewFlagSet("serve", flag.ExitOnError)
		protocol := serveCmd.String("proto", "http", "Protocol to use (http or https)")
		port := serveCmd.String("p", "5000", "Port to use")
		_ = serveCmd.Parse(os.Args[2:])

		// PASS THE DB CLIENT HERE
		serve(*protocol, *port, dbClient)

	case "erase":
		all := false
		if len(os.Args) > 2 {
			switch os.Args[2] {
			case "db":
				all = false
			case "all":
				all = true
			default:
				fmt.Println("Usage: erase [db | all]")
				os.Exit(1)
			}
		}
		erase(SONGS_DIR, all, dbClient)

	case "save":
		saveCmd := flag.NewFlagSet("save", flag.ExitOnError)
		force := saveCmd.Bool("force", false, "save song even if YouTube ID is missing")
		_ = saveCmd.Parse(os.Args[2:])

		if saveCmd.NArg() < 1 {
			fmt.Println("Usage: save [-f|--force] <path_to_file_or_directory>")
			os.Exit(1)
		}
		save(saveCmd.Arg(0), *force, dbClient)

	default:
		printUsage()
		os.Exit(1)
	}
}

func printUsage() {
	fmt.Println("\n🎵 Shazoom CLI - Song Identification & Management")
	fmt.Println("Usage: go run . <command> [arguments]")
	fmt.Println("\nAvailable Commands:")
	fmt.Printf("  %-25s %s\n", "find <file.wav>", "Identify a song from a local WAV file")
	fmt.Printf("  %-25s %s\n", "download <url>", "Download song/album/playlist from Spotify")
	fmt.Printf("  %-25s %s\n", "save [-force] <path>", "Fingerprint and save a file or directory to DB")
	fmt.Printf("  %-25s %s\n", "serve [-p port]", "Start the WebSocket server (default port 5000)")
	fmt.Printf("  %-25s %s\n", "erase [db|all]", "Clear the database and optionally the song files")
	fmt.Println("\nExample:")
	fmt.Println("  go run . serve -p 5001")
	fmt.Println("")
}