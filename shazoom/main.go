package main

import (
    "context"
    "flag"
    "fmt"
    "log/slog"
    "os"
    "shazoom/db" 
    "shazoom/utils"

    "github.com/joho/godotenv"
    "github.com/mdobak/go-xerrors"
)


func main() {
    _ = godotenv.Load()

    logger := utils.GetLogger()
    ctx := context.Background()

    if err := utils.CreateFolder("tmp"); err != nil {
        err = xerrors.New(err)
        logger.ErrorContext(ctx, "failed to create tmp directory", slog.Any("error", err))
    }

    if err := utils.CreateFolder(SONGS_DIR); err != nil {
        err = xerrors.New(err)
        logger.ErrorContext(ctx, "failed to create songs directory", slog.Any("error", err))
    }

    cmd := "serve"
    if len(os.Args) > 1 {
        cmd = os.Args[1]
    }

    switch cmd {
    case "find":
        if len(os.Args) < 3 {
            fmt.Println("Usage: find <path_to_wav_file>")
            os.Exit(1)
        }
        client := getDBOrExit(ctx, logger)
        defer client.Close()
        
        find(os.Args[2])

    case "download":
        if len(os.Args) < 3 {
            fmt.Println("Usage: download <spotify_url>")
            os.Exit(1)
        }
        
        client := getDBOrExit(ctx, logger)
        defer client.Close()

        fmt.Println("Starting download...")
        count, err := download(os.Args[2], client)
        
        if err != nil {
            fmt.Printf("\nDownload failed: %v\n", err)
            os.Exit(1)
        }
        
        fmt.Printf("\nSuccessfully processed %d track(s)!\n", count)

    case "serve":
        serveCmd := flag.NewFlagSet("serve", flag.ExitOnError)
        protocol := serveCmd.String("proto", "http", "Protocol to use (http or https)")
        
        defaultPort := os.Getenv("PORT")
        if defaultPort == "" {
            defaultPort = "8080"
        }
        port := serveCmd.String("p", defaultPort, "Port to use")
        
        if len(os.Args) > 2 {
            _ = serveCmd.Parse(os.Args[2:])
        }

        // 2. LAZY & ROBUST DB CONNECTION
        // We attempt to connect. If it fails, we LOG it but DO NOT EXIT.
        // This allows the web server to start and pass the Cloud Run health check (TCP handshake).
        // Requests requiring DB will fail, but the container stays alive for debugging.
        dbClient, err := db.NewDBClient()
        if err != nil {
            logger.ErrorContext(ctx, "WARNING: Starting server without Database Connection!", slog.Any("error", err))
            fmt.Println(">>> SERVER STARTING IN DISCONNECTED MODE <<<")
        } else {
            defer dbClient.Close()
        }
        
        serve(*protocol, *port, dbClient)

    case "erase":
        client := getDBOrExit(ctx, logger)
        defer client.Close()

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
        erase(SONGS_DIR, all, client)

    case "save":
        client := getDBOrExit(ctx, logger)
        defer client.Close()

        saveCmd := flag.NewFlagSet("save", flag.ExitOnError)
        force := saveCmd.Bool("force", false, "save song even if YouTube ID is missing")
        _ = saveCmd.Parse(os.Args[2:])

        if saveCmd.NArg() < 1 {
            fmt.Println("Usage: save [-f|--force] <path_to_file_or_directory>")
            os.Exit(1)
        }
        save(saveCmd.Arg(0), *force, client)

    default:
        printUsage()
        os.Exit(1)
    }
}

func getDBOrExit(ctx context.Context, logger *slog.Logger) db.DBClient {
    client, err := db.NewDBClient()
    if err != nil {
        logger.ErrorContext(ctx, "CRITICAL: Could not connect to database", slog.Any("error", err))
        fmt.Println("\n--- Troubleshooting DB Connection ---")
        fmt.Println("1. Check DB_HOST/DB_USER/DB_PASS.")
        fmt.Println("2. If using Cloud Run, ensure Cloud SQL Proxy is active.")
        os.Exit(1)
    }
    return client
}

func printUsage() {
    fmt.Println("\n🎵 Shazoom CLI - Song Identification & Management")
    fmt.Println("Usage: go run . <command> [arguments]")
    fmt.Println("\nAvailable Commands:")
    fmt.Printf("  %-25s %s\n", "find <file.wav>", "Identify a song from a local WAV file")
    fmt.Printf("  %-25s %s\n", "download <url>", "Download song/album/playlist from Spotify")
    fmt.Printf("  %-25s %s\n", "save [-force] <path>", "Fingerprint and save a file or directory to DB")
    fmt.Printf("  %-25s %s\n", "serve [-p port]", "Start the WebSocket server")
    fmt.Printf("  %-25s %s\n", "erase [db|all]", "Clear the database and optionally the song files")
    fmt.Println("")
}
