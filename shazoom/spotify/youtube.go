package spotify

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log"
	"log/slog"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"shazoom/utils"
	"strconv"
	"strings"

	"github.com/buger/jsonparser"
	"github.com/joho/godotenv"
	"google.golang.org/api/option"
	"google.golang.org/api/youtube/v3"
)

func getYoutubeIdWithAPI(spTrack Track) (string, error) {
	_ = godotenv.Load()

	developerKey := os.Getenv("YT_KEY")
	if developerKey == "" {
		return "", errors.New("YT_KEY environment variable not set")
	}

	service, err := youtube.NewService(context.TODO(), option.WithAPIKey(developerKey))
	if err != nil {
		log.Printf("Error creating new YouTube client: %v", err)
		return "", err
	}

	query := fmt.Sprintf("'%s' %s %s", spTrack.Title, spTrack.Artist, spTrack.Album)
	call := service.Search.List([]string{"id"}).
		Q(query).
		VideoCategoryId("10").
		Type("video").
		MaxResults(5)

	resp, err := call.Do()
	if err != nil {
		log.Printf("Error making search API call: %v", err)
		return "", err
	}
	for _, item := range resp.Items {
		if item.Id.Kind == "youtube#video" && item.Id.VideoId != "" {
			return item.Id.VideoId, nil
		}
	}
	return "", nil
}

var httpClient = &http.Client{}
var durationMatchThreshold = 5

type SearchResult struct {
	Title, Uploader, URL, Duration, ID string
	Live                               bool
	SourceName                         string
	Extra                              []string
}

func convertStringDurationToSeconds(durationStr string) int {
	splitEntities := strings.Split(durationStr, ":")
	if len(splitEntities) == 1 {
		seconds, _ := strconv.Atoi(splitEntities[0])
		return seconds
	} else if len(splitEntities) == 2 {
		seconds, _ := strconv.Atoi(splitEntities[1])
		minutes, _ := strconv.Atoi(splitEntities[0])
		return (minutes * 60) + seconds
	} else if len(splitEntities) == 3 {
		seconds, _ := strconv.Atoi(splitEntities[2])
		minutes, _ := strconv.Atoi(splitEntities[1])
		hours, _ := strconv.Atoi(splitEntities[0])
		return ((hours * 60) * 60) + (minutes * 60) + seconds
	}
	return 0
}

func GetYoutubeId(track Track) (string, error) {
	songDurationInSeconds := track.Duration
	searchQuery := fmt.Sprintf("'%s' %s", track.Title, track.Artist)

	searchResults, err := ytSearch(searchQuery, 10)
	if err != nil {
		return "", err
	}
	if len(searchResults) == 0 {
		return "", fmt.Errorf("no songs found for %s", searchQuery)
	}

	for _, result := range searchResults {
		allowedDurationRangeStart := songDurationInSeconds - durationMatchThreshold
		allowedDurationRangeEnd := songDurationInSeconds + durationMatchThreshold
		resultSongDuration := convertStringDurationToSeconds(result.Duration)
		if resultSongDuration >= allowedDurationRangeStart && resultSongDuration <= allowedDurationRangeEnd {
			fmt.Printf("INFO: Found song with id '%s'\n", result.ID)
			return result.ID, nil
		}
	}

	return "", fmt.Errorf("could not settle on a song from search result for: %s", searchQuery)
}

func getContent(data []byte, index int) []byte {
	id := fmt.Sprintf("[%d]", index)
	contents, _, _, _ := jsonparser.Get(data, "contents", "twoColumnSearchResultsRenderer", "primaryContents", "sectionListRenderer", "contents", id, "itemSectionRenderer", "contents")
	return contents
}

func ytSearch(searchTerm string, limit int) (results []*SearchResult, err error) {
	ytSearchUrl := fmt.Sprintf("https://www.youtube.com/results?search_query=%s", url.QueryEscape(searchTerm))
	req, err := http.NewRequest("GET", ytSearchUrl, nil)
	if err != nil {
		return nil, errors.New("cannot create youtube request")
	}
	req.Header.Add("Accept-Language", "en")
	res, err := httpClient.Do(req)
	if err != nil {
		return nil, errors.New("cannot get youtube page")
	}
	defer res.Body.Close()

	if res.StatusCode != 200 {
		return nil, errors.New("failed to make a request to youtube")
	}

	buffer, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, errors.New("cannot read response from youtube")
	}

	body := string(buffer)
	splitScript := strings.Split(body, `window["ytInitialData"] = `)
	if len(splitScript) != 2 {
		splitScript = strings.Split(body, `var ytInitialData = `)
	}

	if len(splitScript) != 2 {
		return nil, errors.New("invalid response from youtube")
	}
	splitScript = strings.Split(splitScript[1], `window["ytInitialPlayerResponse"] = null;`)
	jsonData := []byte(splitScript[0])

	index := 0
	var contents []byte
	for {
		contents = getContent(jsonData, index)
		_, _, _, err = jsonparser.Get(contents, "[0]", "carouselAdRenderer")
		if err == nil {
			index++
		} else {
			break
		}
	}

	_, err = jsonparser.ArrayEach(contents, func(value []byte, t jsonparser.ValueType, i int, err error) {
		if err != nil || (limit > 0 && len(results) >= limit) {
			return
		}

		id, _ := jsonparser.GetString(value, "videoRenderer", "videoId")
		title, _ := jsonparser.GetString(value, "videoRenderer", "title", "runs", "[0]", "text")
		uploader, _ := jsonparser.GetString(value, "videoRenderer", "ownerText", "runs", "[0]", "text")
		duration, err := jsonparser.GetString(value, "videoRenderer", "lengthText", "simpleText")

		live := err != nil
		if id != "" && title != "" {
			results = append(results, &SearchResult{
				Title:      title,
				Uploader:   uploader,
				Duration:   duration,
				ID:         id,
				URL:        fmt.Sprintf("https://youtube.com/watch?v=%s", id),
				Live:       live,
				SourceName: "youtube",
			})
		}
	})

	return results, err
}

// downloadYTaudio downloads audio from a YouTube video using yt-dlp.
func downloadYTaudio(videoURL, outputFilePath string) (string, error) {
	logger := utils.GetLogger()

	dir := filepath.Dir(outputFilePath)
	if stat, err := os.Stat(dir); err != nil || !stat.IsDir() {
		logger.Error("Invalid directory for output file", slog.Any("error", err))
		return "", errors.New("output directory does not exist")
	}

	if _, err := exec.LookPath("yt-dlp"); err != nil {
		logger.Error("yt-dlp not found in PATH", slog.Any("error", err))
		return "", errors.New("yt-dlp is not installed")
	}

	audioFmt := "wav"
	args := []string{"-v"}
	
	cookiesPath := "/secrets/youtube_cookies.txt"
	writableCookiesPath := "/tmp/youtube_cookies.txt"
	
	if _, err := os.Stat(cookiesPath); err == nil {
		input, err := os.ReadFile(cookiesPath)
		if err != nil {
			logger.Warn("Could not read cookies file", slog.Any("error", err))
		} else {
			if err := os.WriteFile(writableCookiesPath, input, 0600); err != nil {
				logger.Warn("Could not write cookies to temp", slog.Any("error", err))
			} else {
				args = append(args, "--cookies", writableCookiesPath)
				logger.Info("Using YouTube cookies for authentication")
			}
		}
	} else {
		logger.Warn("Cookies file not found, proceeding without authentication",
			slog.String("path", cookiesPath))
	}
	
	args = append(args,
		"--js-runtime", "node",
		"--extract-audio",
		"--audio-format", audioFmt,
		"-f", "bestaudio",
		"-o", outputFilePath,
		videoURL,
	)
	
	cmd := exec.Command("yt-dlp", args...)

	output, err := cmd.CombinedOutput()
	if err != nil {
		if strings.Contains(string(output), "LOGIN_REQUIRED") ||
		   strings.Contains(string(output), "Sign in to confirm you're not a bot") {
			logger.Warn("Skipping login-protected YouTube video",
				slog.String("output", string(output)))
			return "", nil
		}
		logger.Error("yt-dlp command failed",
			slog.String("output", string(output)),
			slog.Any("error", err))
		return "", err
	}

	return outputFilePath + "." + audioFmt, nil
}

