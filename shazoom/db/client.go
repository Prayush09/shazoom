package db

import (
	"fmt"
	"shazoom/models"
	"shazoom/utils"
)

type DBClient interface {
	Close() error
	StoreFingerprints(fingerprints map[int64]models.Couple) error
	GetCouples(addresses []int64) (map[int64][]models.Couple, error)

	TotalSongs() (int, error)
	RegisterSong(songTitle, songArtist, ytID string) (uint32, error)
	GetSong(filterKey string, value interface{}) (Song, bool, error)
	GetSongByID(songID uint32) (Song, bool, error)
	GetSongByYTID(ytID string) (Song, bool, error)
	GetSongByKey(key string) (Song, bool, error)
	DeleteSongByID(songID uint32) error
	DeleteCollection(collectionName string) error
}

type Song struct {
	Title     string
	Artist    string
	YouTubeID string
}

func setupTestEnv() {
	DB_HOST := utils.GetEnv("DB_HOST")
	DB_PORT := utils.GetEnv("DB_PORT")
	DB_PASS := utils.GetEnv("DB_PASS")
	DB_NAME := utils.GetEnv("DB_NAME")
	DB_USER := utils.GetEnv("DB_USER")
	vars := map[string]string{
		"DB_HOST": DB_HOST,
		"DB_PORT": DB_PORT,
		"DB_PASS": DB_PASS,
		"DB_NAME": DB_NAME,
		"DB_USER": DB_USER,
	}
	for key, val := range vars {
		if val == "" {
			fmt.Printf("FATAL: Required env %s is not set or is empty.", key)
		}
	}
}

func NewDBClient() (DBClient, error) {
    setupTestEnv()
    var (
        dbUser = utils.GetEnv("DB_USER")
        dbPass = utils.GetEnv("DB_PASS")
        dbHost = utils.GetEnv("DB_HOST") 
        dbPort = utils.GetEnv("DB_PORT")
        dbName = utils.GetEnv("DB_NAME")
    )

    fmt.Printf("DEBUG: Connecting to %s as user %s\n", dbHost, dbUser)

    dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable",
        dbHost, dbUser, dbPass, dbName, dbPort)

    return NewPostgresClient(dsn)
}
