package main

import (
	"fmt"
	"shazoom/core"
	"shazoom/fileformat"
	"shazoom/utils"

	"github.com/fatih/color"
)

const SONGS_DIR = "songs"

var yellow = color.New(color.FgYellow)

func find(filePath string){
	wavFilePath, err := fileformat.ConvertToWAV(filePath)
	if err != nil {
		yellow.Println("Error converting to WAV [Server]:", err)
		panic(err)
	}

	fingerprint, err := core.GenerateFingerprints(wavFilePath, utils.GenerateUniqueID())
	if err != nil {
		yellow.Println("Error converting to WAV:", err)
		panic(err)
	}

	sampleFingerprint := make(map[int64]uint32)
	for address, couple := range fingerprint{
		sampleFingerprint[address] = couple.AnchorTime
	}

	matches, searchDuration, err := core.FindMatchesUsingFingerPrints(sampleFingerprint)
	if err != nil {
		yellow.Println("Error finding matches:", err)
	}

	if len(matches) == 0 {
		fmt.Println("\nNo Matches Found :(")
		fmt.Printf("\nSearch duration: %s\n", searchDuration)
		return
	}

	msg := "Matches:"
	topMatches := matches
	if len(matches) >= 20 {
		msg = "Top 20 matches:"
		topMatches = matches[:20]
	}

	fmt.Println(msg)
	for _, match := range topMatches {
		fmt.Printf("\t- %s by %s, score: %.2f\n",
			match.SongTitle, match.SongArtist, match.Score)
	}

	fmt.Printf("\nSearch Duration: %s\n", searchDuration)
	topMatch := topMatches[0]
	fmt.Printf("\nFinal Prediction: %s by %s with a score: %.2f\n", topMatch.SongTitle, topMatch.SongArtist, topMatch.Score)
}

//TODO: IMPLEMENT THESE REMANING FUNCTIONS 
func download(){

}


func serve(){

}

func serveHTTP(){

}

func erase(){

}

func save(){

}

func processSongs(){

}

func saveSong(){

}


