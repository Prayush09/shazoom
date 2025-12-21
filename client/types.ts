export interface SongResult {
  title: string;
  artist: string;
  album: string;
  coverArt: string;
  timeAgo: string;
  score?: number;
  youtubeId?: string;
}

export interface MatchResult {
  SongTitle: string;
  SongArtist: string;
  Score: number;
  YouTubeID?: string;
}

export interface DownloadStatus {
  type: 'info' | 'success' | 'error';
  message: string;
}